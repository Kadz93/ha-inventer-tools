# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Markus Hennig
# Copyright (c) 2026 Tobias Krautkremer
"""Dynamic zone scheduling: temporarily assign devices to different zones based on time."""
from datetime import datetime, time
import logging

try:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.event import async_track_time_change
    from homeassistant.helpers.storage import Store
    from homeassistant.util import dt as dt_util
except ImportError:
    HomeAssistant = None
    async_track_time_change = None
    Store = None
    dt_util = None

try:
    from .const import DOMAIN
except ImportError:
    DOMAIN = "inventer_e16"

LOGGER = logging.getLogger(__package__)
STORAGE_VERSION = 1


def parse_time(val: str | time) -> time:
    """Parse a time string (HH:MM or HH:MM:SS) or return time object."""
    if isinstance(val, time):
        return val
    parts = val.split(":")
    return time(int(parts[0]), int(parts[1]))


def is_rule_active(rule: dict, now: datetime) -> bool:
    """Return True if rule should be active at datetime `now`.

    Supports overnight intervals (start_time > end_time) and weekday filtering.
    Weekdays are 0=Monday .. 6=Sunday (Python datetime convention).
    """
    if not rule.get("enabled", True):
        return False
    try:
        start = parse_time(rule["start_time"])
        end = parse_time(rule["end_time"])
    except (ValueError, TypeError, KeyError) as err:
        LOGGER.warning("Invalid time format in dynamic zone rule: %s", err)
        return False

    weekdays = rule.get("weekdays")
    if weekdays is None:
        weekdays = [0, 1, 2, 3, 4, 5, 6]

    current_time = now.time()
    today_weekday = now.weekday()

    if start == end:
        return False
    if start < end:
        # Same-day interval, e.g. 14:00 to 18:00
        return today_weekday in weekdays and (start <= current_time < end)

    # Overnight interval, e.g. 22:00 to 07:00
    if current_time >= start:
        # Started today evening
        return today_weekday in weekdays
    if current_time < end:
        # Started yesterday evening
        yesterday_weekday = (today_weekday - 1) % 7
        return yesterday_weekday in weekdays

    return False


class DynamicZoneManager:
    """Manages dynamic time-based zone assignments for individual devices."""

    def __init__(self, hass: HomeAssistant, entry, coordinator):
        self.hass = hass
        self.entry = entry
        self.coordinator = coordinator
        self._store = Store(hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}.dynamic_zones") if Store else None
        self._rules: dict[int, dict] = {}
        self._unsub_timer = None

    async def async_load(self):
        """Load configured dynamic zone rules from Home Assistant storage."""
        if not self._store:
            return
        try:
            raw = await self._store.async_load()
            if isinstance(raw, dict):
                self._rules = {int(k): v for k, v in raw.items() if str(k).isdigit() and isinstance(v, dict)}
            else:
                self._rules = {}
        except Exception as err:
            LOGGER.error("Failed to load dynamic zone rules: %s", err)
            self._rules = {}

    async def async_save(self):
        """Persist dynamic zone rules to Home Assistant storage."""
        if not self._store:
            return
        try:
            await self._store.async_save({str(k): v for k, v in self._rules.items()})
        except Exception as err:
            LOGGER.error("Failed to save dynamic zone rules: %s", err)

    def async_start(self):
        """Start tracking time to evaluate dynamic zone transitions."""
        if self._unsub_timer is not None:
            return
        self._unsub_timer = async_track_time_change(self.hass, self._async_time_tick, second=0)
        # Schedule initial check
        self.hass.async_create_task(self._async_check_all_rules())

    def async_stop(self):
        """Stop tracking time and cleanup."""
        if self._unsub_timer is not None:
            self._unsub_timer()
            self._unsub_timer = None

    async def _async_time_tick(self, now: datetime):
        """Called every minute on the 0-second mark."""
        await self._async_check_all_rules(now)

    def get_rule(self, address: int) -> dict | None:
        """Get the dynamic zone rule for a specific device address."""
        rule = self._rules.get(address)
        return dict(rule) if rule else None

    def get_all_rules(self) -> dict[int, dict]:
        """Get all configured rules."""
        return {addr: dict(rule) for addr, rule in self._rules.items()}

    def _get_device_current_zone(self, address: int) -> int | None:
        """Read the currently assigned zone for a device from coordinator data."""
        if not self.coordinator or not self.coordinator.data:
            return None
        for dev in self.coordinator.data.get("devices", []):
            if dev.get("address") == address:
                return dev.get("zone")
        return None

    async def async_set_rule(
        self,
        address: int,
        target_zone: int,
        start_time: str,
        end_time: str,
        enabled: bool = True,
        weekdays: list[int] | None = None,
        original_zone: int | None = None,
    ) -> dict:
        """Create or update a dynamic zone rule for a device."""
        current_zone = self._get_device_current_zone(address)
        if original_zone is None:
            existing = self._rules.get(address)
            if existing and existing.get("original_zone"):
                original_zone = existing["original_zone"]
            else:
                original_zone = current_zone if (current_zone and current_zone != target_zone) else 1

        if weekdays is None:
            weekdays = [0, 1, 2, 3, 4, 5, 6]

        rule = {
            "address": address,
            "target_zone": target_zone,
            "original_zone": original_zone,
            "start_time": str(start_time)[:5],
            "end_time": str(end_time)[:5],
            "weekdays": sorted(list(set(weekdays))),
            "enabled": bool(enabled),
            "active": False,
        }
        self._rules[address] = rule
        await self.async_save()
        await self._async_check_all_rules()
        return rule

    async def async_delete_rule(self, address: int):
        """Remove a dynamic zone rule and revert device if currently in target zone."""
        rule = self._rules.pop(address, None)
        if not rule:
            return
        await self.async_save()
        if rule.get("active"):
            orig_zone = rule.get("original_zone", 1)
            LOGGER.info("Dynamic zone deleted for device %s; reverting to zone %s", address, orig_zone)
            try:
                await self.coordinator.async_set_device_zone(address, orig_zone)
            except Exception as err:
                LOGGER.error("Failed to revert device %s to zone %s on rule deletion: %s", address, orig_zone, err)

    async def _async_check_all_rules(self, now: datetime | None = None):
        """Evaluate rules and trigger zone changes when entering or leaving intervals."""
        if now is None:
            now = dt_util.now() if dt_util else datetime.now()

        for address, rule in list(self._rules.items()):
            try:
                await self._async_evaluate_rule(address, rule, now)
            except Exception as err:
                LOGGER.error("Error evaluating dynamic zone rule for device %s: %s", address, err)

    async def _async_evaluate_rule(self, address: int, rule: dict, now: datetime):
        """Evaluate a single rule against current time."""
        if not rule.get("enabled", True):
            if rule.get("active"):
                # Was active when disabled: revert
                orig_zone = rule.get("original_zone", 1)
                LOGGER.info("Dynamic zone disabled for device %s; reverting to zone %s", address, orig_zone)
                rule["active"] = False
                await self.async_save()
                await self.coordinator.async_set_device_zone(address, orig_zone)
            return

        should_be_active = is_rule_active(rule, now)
        current_zone = self._get_device_current_zone(address)

        if should_be_active:
            if not rule.get("active"):
                # Transition: inactive -> active
                if current_zone and current_zone != rule["target_zone"]:
                    rule["original_zone"] = current_zone
                target = rule["target_zone"]
                LOGGER.info(
                    "Dynamic zone activated for device %s: switching to zone %s (original: %s)",
                    address,
                    target,
                    rule.get("original_zone"),
                )
                rule["active"] = True
                await self.async_save()
                if current_zone != target:
                    await self.coordinator.async_set_device_zone(address, target)
            else:
                # Still in active window: ensure target zone is maintained
                if current_zone is not None and current_zone != rule["target_zone"]:
                    LOGGER.info(
                        "Dynamic zone reinforcing zone %s for device %s (detected in zone %s)",
                        rule["target_zone"],
                        address,
                        current_zone,
                    )
                    await self.coordinator.async_set_device_zone(address, rule["target_zone"])
        else:
            if rule.get("active"):
                # Transition: active -> inactive
                orig_zone = rule.get("original_zone", 1)
                LOGGER.info("Dynamic zone ended for device %s: reverting to zone %s", address, orig_zone)
                rule["active"] = False
                await self.async_save()
                if current_zone != orig_zone:
                    await self.coordinator.async_set_device_zone(address, orig_zone)
            else:
                # Inactive: keep original_zone tracked if user changed zone normally during the day
                if current_zone is not None and current_zone != rule.get("target_zone") and current_zone != rule.get("original_zone"):
                    rule["original_zone"] = current_zone
                    await self.async_save()
