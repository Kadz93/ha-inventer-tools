# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Markus Hennig
# Copyright (c) 2026 Tobias Krautkremer
"""Unit tests for dynamic zone scheduling and rules evaluation."""
from datetime import datetime, time
import importlib.util
from pathlib import Path
from unittest.mock import MagicMock

spec = importlib.util.spec_from_file_location(
    "custom_components.inventer_e16.dynamic_zones",
    Path(__file__).resolve().parents[1] / "custom_components/inventer_e16/dynamic_zones.py",
)
dynamic_zones = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dynamic_zones)

parse_time = dynamic_zones.parse_time
is_rule_active = dynamic_zones.is_rule_active
DynamicZoneManager = dynamic_zones.DynamicZoneManager


def run_coro(coro):
    """Step through coroutine without needing an event loop or socket loopback."""
    try:
        while True:
            coro.send(None)
    except StopIteration as exc:
        return exc.value


async def dummy_async(*args, **kwargs):
    pass


def test_parse_time():
    assert parse_time("22:00") == time(22, 0)
    assert parse_time("07:30") == time(7, 30)
    assert parse_time("06:15:30") == time(6, 15)
    assert parse_time(time(14, 25)) == time(14, 25)


def test_is_rule_active_disabled():
    rule = {
        "enabled": False,
        "start_time": "22:00",
        "end_time": "07:00",
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
    }
    # Friday 23:00
    now = datetime(2026, 10, 23, 23, 0, 0)
    assert not is_rule_active(rule, now)


def test_is_rule_active_invalid_time():
    rule = {"enabled": True, "start_time": "invalid", "end_time": "07:00"}
    now = datetime(2026, 10, 23, 23, 0, 0)
    assert not is_rule_active(rule, now)


def test_is_rule_active_same_day_interval():
    rule = {
        "enabled": True,
        "start_time": "14:00",
        "end_time": "18:00",
        "weekdays": [0, 1, 2, 3, 4],  # Mon-Fri
    }
    # Friday 13:59:59 (weekday 4) -> False
    assert not is_rule_active(rule, datetime(2026, 10, 23, 13, 59, 59))
    # Friday 14:00:00 -> True
    assert is_rule_active(rule, datetime(2026, 10, 23, 14, 0, 0))
    # Friday 16:30:00 -> True
    assert is_rule_active(rule, datetime(2026, 10, 23, 16, 30, 0))
    # Friday 17:59:59 -> True
    assert is_rule_active(rule, datetime(2026, 10, 23, 17, 59, 59))
    # Friday 18:00:00 -> False
    assert not is_rule_active(rule, datetime(2026, 10, 23, 18, 0, 0))
    # Saturday 15:00:00 (weekday 5) -> False (not in weekdays)
    assert not is_rule_active(rule, datetime(2026, 10, 24, 15, 0, 0))


def test_is_rule_active_overnight_interval():
    rule = {
        "enabled": True,
        "start_time": "22:00",
        "end_time": "07:00",
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
    }
    # 21:59:59 -> False
    assert not is_rule_active(rule, datetime(2026, 10, 23, 21, 59, 59))
    # 22:00:00 -> True (start)
    assert is_rule_active(rule, datetime(2026, 10, 23, 22, 0, 0))
    # 23:30:00 -> True
    assert is_rule_active(rule, datetime(2026, 10, 23, 23, 30, 0))
    # 00:00:00 -> True
    assert is_rule_active(rule, datetime(2026, 10, 24, 0, 0, 0))
    # 06:59:59 -> True
    assert is_rule_active(rule, datetime(2026, 10, 24, 6, 59, 59))
    # 07:00:00 -> False (end)
    assert not is_rule_active(rule, datetime(2026, 10, 24, 7, 0, 0))
    # 12:00:00 -> False
    assert not is_rule_active(rule, datetime(2026, 10, 24, 12, 0, 0))


def test_is_rule_active_overnight_weekdays_boundary():
    # Only active on Friday night (weekday 4)
    rule = {
        "enabled": True,
        "start_time": "22:00",
        "end_time": "07:00",
        "weekdays": [4],
    }
    # Friday 22:30 -> True (Friday is in weekdays)
    assert is_rule_active(rule, datetime(2026, 10, 23, 22, 30, 0))
    # Saturday 03:00 -> True (Started yesterday on Friday)
    assert is_rule_active(rule, datetime(2026, 10, 24, 3, 0, 0))
    # Saturday 07:00 -> False
    assert not is_rule_active(rule, datetime(2026, 10, 24, 7, 0, 0))
    # Saturday 22:30 -> False (Saturday is not in weekdays)
    assert not is_rule_active(rule, datetime(2026, 10, 24, 22, 30, 0))
    # Sunday 03:00 -> False (Started Saturday, not in weekdays)
    assert not is_rule_active(rule, datetime(2026, 10, 25, 3, 0, 0))


def test_is_rule_active_zero_duration():
    rule = {
        "enabled": True,
        "start_time": "22:00",
        "end_time": "22:00",
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
    }
    assert not is_rule_active(rule, datetime(2026, 10, 23, 22, 0, 0))


def test_dynamic_zone_manager_transitions():
    hass = MagicMock()
    entry = MagicMock()
    entry.entry_id = "test_entry"
    coordinator = MagicMock()
    coordinator.data = {
        "devices": [
            {"address": 1, "zone": 1, "name": "Fan 1"},
            {"address": 2, "zone": 2, "name": "Fan 2"},
        ]
    }
    coordinator.async_set_device_zone = MagicMock(side_effect=dummy_async)

    manager = DynamicZoneManager(hass, entry, coordinator)
    manager._store = MagicMock()
    async def dummy_load():
        return {}
    manager._store.async_load = MagicMock(side_effect=dummy_load)
    manager._store.async_save = MagicMock(side_effect=dummy_async)

    run_coro(manager.async_load())

    # Insert rule directly for address 1
    manager._rules[1] = {
        "address": 1,
        "target_zone": 3,
        "original_zone": 1,
        "start_time": "22:00",
        "end_time": "07:00",
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
        "enabled": True,
        "active": False,
    }

    # 1. Daytime (15:00): inactive
    run_coro(manager._async_check_all_rules(datetime(2026, 10, 23, 15, 0, 0)))
    coordinator.async_set_device_zone.assert_not_called()
    assert not manager.get_rule(1)["active"]

    # 2. Nighttime (22:30): transitions to active -> sets zone 3
    run_coro(manager._async_check_all_rules(datetime(2026, 10, 23, 22, 30, 0)))
    coordinator.async_set_device_zone.assert_called_once_with(1, 3)
    assert manager.get_rule(1)["active"]

    coordinator.async_set_device_zone.reset_mock()
    coordinator.data["devices"][0]["zone"] = 3

    # 3. Later that night (03:00): remains active, no new call needed
    run_coro(manager._async_check_all_rules(datetime(2026, 10, 24, 3, 0, 0)))
    coordinator.async_set_device_zone.assert_not_called()

    # 4. Morning (07:01): transitions to inactive -> sets back to zone 1
    run_coro(manager._async_check_all_rules(datetime(2026, 10, 24, 7, 1, 0)))
    coordinator.async_set_device_zone.assert_called_once_with(1, 1)
    assert not manager.get_rule(1)["active"]


def test_dynamic_zone_manager_disable_reverts_if_active():
    hass = MagicMock()
    entry = MagicMock()
    entry.entry_id = "test_entry"
    coordinator = MagicMock()
    coordinator.data = {"devices": [{"address": 1, "zone": 3}]}
    coordinator.async_set_device_zone = MagicMock(side_effect=dummy_async)

    manager = DynamicZoneManager(hass, entry, coordinator)
    manager._store = MagicMock()
    manager._store.async_save = MagicMock(side_effect=dummy_async)

    # Active rule is disabled
    manager._rules[1] = {
        "address": 1,
        "target_zone": 3,
        "original_zone": 1,
        "start_time": "22:00",
        "end_time": "07:00",
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
        "enabled": False,
        "active": True,
    }

    run_coro(manager._async_check_all_rules(datetime(2026, 10, 23, 23, 0, 0)))
    coordinator.async_set_device_zone.assert_called_once_with(1, 1)
    assert not manager.get_rule(1)["active"]


def test_dynamic_zone_manager_delete_reverts_if_active():
    hass = MagicMock()
    entry = MagicMock()
    entry.entry_id = "test_entry"
    coordinator = MagicMock()
    coordinator.data = {"devices": [{"address": 1, "zone": 3}]}
    coordinator.async_set_device_zone = MagicMock(side_effect=dummy_async)

    manager = DynamicZoneManager(hass, entry, coordinator)
    manager._store = MagicMock()
    manager._store.async_save = MagicMock(side_effect=dummy_async)

    manager._rules[1] = {
        "address": 1,
        "target_zone": 3,
        "original_zone": 1,
        "start_time": "22:00",
        "end_time": "07:00",
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
        "enabled": True,
        "active": True,
    }

    run_coro(manager.async_delete_rule(1))
    coordinator.async_set_device_zone.assert_called_once_with(1, 1)
    assert manager.get_rule(1) is None
