# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Tobias Krautkremer
# Copyright (c) 2026 Markus Hennig
"""inVENTer Easy Connect e16 - local control over Wi-Fi (TLS-PSK)."""
import json
import logging
from pathlib import Path

from homeassistant.const import Platform
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from homeassistant.helpers import device_registry as dr

from . import coordinator
from .const import CONF_DEVICE_ID, CONF_FIRMWARE_CATALOG, DOMAIN

LOGGER = logging.getLogger(__package__)

PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR, Platform.FAN, Platform.BUTTON,
             Platform.NUMBER, Platform.SELECT, Platform.UPDATE]
CARDS = [
    ("/inventer_e16/inventer-e16-schedule-card.js", Path(__file__).parent / "frontend" / "inventer-e16-schedule-card.js"),
    ("/inventer_e16/inventer-e16-devices-card.js", Path(__file__).parent / "frontend" / "inventer-e16-devices-card.js"),
]

_MANIFEST_VERSION: str | None = None


def _get_version() -> str:
    """Return the integration version from manifest.json (cached after first read)."""
    global _MANIFEST_VERSION  # noqa: PLW0603
    if _MANIFEST_VERSION is None:
        try:
            manifest = json.loads((Path(__file__).parent / "manifest.json").read_text(encoding="utf-8"))
            _MANIFEST_VERSION = manifest.get("version", "0")
        except Exception:  # noqa: BLE001
            _MANIFEST_VERSION = "0"
    return _MANIFEST_VERSION


async def _async_register_frontend(hass):
    """Register custom cards as Lovelace resources so the mobile app loads them synchronously."""
    if hass.data.get(DOMAIN, {}).get("frontend_registered"):
        return
    hass.data.setdefault(DOMAIN, {})["frontend_registered"] = True

    static_paths = [(url, path) for url, path in CARDS if path.is_file()]
    if not static_paths:
        return

    version = _get_version()

    # 1. Serve the JS files via HTTP (URL without query string so the route matches).
    from homeassistant.components.http import StaticPathConfig

    try:
        await hass.http.async_register_static_paths([
            StaticPathConfig(url, str(path), cache_headers=False)
            for url, path in static_paths
        ])
    except Exception as err:
        LOGGER.warning("Could not register HTTP static paths for custom cards: %s", err)

    # 2. Register as Lovelace resources with a version query string for cache busting.
    #    Falls back to add_extra_js_url for YAML-mode dashboards.
    registered_as_resource = False
    try:
        lovelace_data = hass.data.get("lovelace")
        if lovelace_data and hasattr(lovelace_data, "resources"):
            from homeassistant.components.lovelace.resources import ResourceStorageCollection

            resources = lovelace_data.resources
            if isinstance(resources, ResourceStorageCollection):
                if not resources.loaded:
                    await resources.async_load()
                existing = {
                    item["url"].split("?")[0]: item
                    for item in resources.async_items()
                }
                for url, _ in static_paths:
                    versioned_url = f"{url}?v={version}"
                    if url not in existing:
                        await resources.async_create_item({"res_type": "module", "url": versioned_url})
                    elif existing[url].get("url") != versioned_url:
                        await resources.async_update_item(
                            existing[url]["id"],
                            {"res_type": "module", "url": versioned_url},
                        )
                registered_as_resource = True
    except Exception as err:
        LOGGER.debug("Could not register Lovelace resources, falling back to extra_js_url: %s", err)

    if not registered_as_resource:
        try:
            from homeassistant.components.frontend import add_extra_js_url

            for url, _ in static_paths:
                add_extra_js_url(hass, f"{url}?v={version}")
        except Exception as err:
            LOGGER.warning("Could not register custom cards via add_extra_js_url: %s", err)


async def async_migrate_entry(hass, entry):
    """1.1 -> 1.2: the firmware catalog became opt-in. Entries that never stored the option had it
    on, so store that explicitly - an update must not silently switch it off."""
    if entry.version > 1:
        return False
    if entry.minor_version < 2:
        options = {CONF_FIRMWARE_CATALOG: True, **entry.options}
        hass.config_entries.async_update_entry(entry, options=options, minor_version=2)
    return True


async def async_setup_entry(hass, entry):
    data = coordinator.create(hass, entry)
    await data.info.async_config_entry_first_refresh()

    dev_reg = dr.async_get(hass)
    device_id = entry.data[CONF_DEVICE_ID]
    zone_prefix = f"{device_id}_z"
    known_registered_zones = {
        int(ident[len(zone_prefix):])
        for dev in dr.async_entries_for_config_entry(dev_reg, entry.entry_id)
        for domain, ident in dev.identifiers
        if domain == DOMAIN and ident.startswith(zone_prefix) and ident[len(zone_prefix):].isdigit()
    }

    assigned_zones = {
        d["zone"] for d in (data.info.data.get("devices") or [])
        if d.get("zone") and d["zone"] > 0
    }

    client = data.info.client
    try:
        raw_zones = await hass.async_add_executor_job(client.get_zones)
    except coordinator.E16AuthError as error:
        raise ConfigEntryAuthFailed("The controller rejected the PSK") from error
    except (OSError, ValueError) as error:
        raise ConfigEntryNotReady(f"Reading e16 zones failed: {error}") from error

    if not isinstance(raw_zones, list):
        if isinstance(raw_zones, dict):
            raw_zones = [raw_zones]
        else:
            raw_zones = [{"zone_id": 1, "name": "Zone 1"}]

    data.zones = []
    seen_zone_ids = set()
    for index, zone_data in enumerate(raw_zones):
        if not zone_data or not isinstance(zone_data, dict):
            continue
        zid = zone_data.get("zone_id")
        if not zid or zid in seen_zone_ids:
            continue
        seen_zone_ids.add(zid)
        if index == 0 or zid == 1:
            is_active = True
        else:
            is_active = (
                zid in assigned_zones
                or bool(zone_data.get("name") and zone_data["name"].strip())
                or zid in known_registered_zones
            )
        if not is_active:
            continue
        zone_coord = coordinator.E16ZoneCoordinator(hass, entry, client, index)
        zone_coord.async_set_updated_data(zone_data)
        data.zones.append(zone_coord)

    missing_zones = known_registered_zones - seen_zone_ids
    if missing_zones:
        raise ConfigEntryNotReady(f"Expected zone(s) {missing_zones} missing from e16 controller")

    if not data.zones:
        raise ConfigEntryNotReady("No active zones found on e16 controller")

    # Create the main device first: fans and sensors reference it via via_device_id
    data.main_device_id = dev_reg.async_get_or_create(
        config_entry_id=entry.entry_id, identifiers={(DOMAIN, device_id)},
        name=entry.title, manufacturer="inVENTer", model="Easy Connect e16",
    ).id
    # Create zone devices for multi-zone setups (zone 2+)
    if len(data.zones) > 1:
        for zone_coord in data.zones[1:]:
            zone_data = zone_coord.data
            dev_reg.async_get_or_create(
                config_entry_id=entry.entry_id,
                identifiers={(DOMAIN, f"{device_id}_z{zone_data['zone_id']}")},
                name=f"inVENTer {zone_data['name']}" if zone_data.get("name") else f"inVENTer Zone {zone_data['zone_id']}",
                manufacturer="inVENTer", model="Easy Connect e16",
                via_device_id=data.main_device_id,
            )
    entry.runtime_data = data
    from .dynamic_zones import DynamicZoneManager

    data.dynamic_zones = DynamicZoneManager(hass, entry, data.info)
    await data.dynamic_zones.async_load()
    data.dynamic_zones.async_start()

    await _async_register_frontend(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    # No update listener: it would reload on every entry change, even when Home Assistant only
    # records a DHCP discovery key. Options reload via OptionsFlowWithReload, flows via their abort.
    return True


async def async_unload_entry(hass, entry):
    data = entry.runtime_data
    if data and getattr(data, "dynamic_zones", None):
        data.dynamic_zones.async_stop()
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
