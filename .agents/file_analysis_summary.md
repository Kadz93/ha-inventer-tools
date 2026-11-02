# ha-inventer-e16: Codebase & Multi-Zone File Analysis Summary

This document summarizes the codebase architecture, file responsibilities, protocol specifications, and the multi-zone review fixes so subsequent agents do not need to read all files from scratch.

---

## 1. Project Overview & Architecture

Home Assistant custom component `inventer_e16` for the **inVENTer Easy Connect e16** ventilation controller.
- **Protocol:** "Zirconia" binary protocol over TLS-PSK (TLS 1.2, PSK-AES128-CBC-SHA, TCP 47820, identity: `zirconia`).
- **Device hierarchy:**
  - Controller (main device): Unique ID `<device_id>`. In single-zone setups, Zone 1 entities live on this device.
  - In multi-zone setups: Zone 1 remains on the main device (unique IDs `<device_id>_<key>` to preserve existing setups); Zones 2..4 get dedicated zone devices with unique IDs `<device_id>_z<zone_id>_<key>`.
  - Radio devices (fans, T/RH sensors, CO2/VOC sensors): Devices hanging below the controller with address 0..31, unique IDs `<device_id>_<address>_<key>`.

---

## 2. File Responsibilities

| File | Role / Contents |
|---|---|
| `custom_components/inventer_e16/__init__.py` | Integration setup (`async_setup_entry`), zone discovery via `client.get_zones()`, HA device registry registration, frontend card registration, platforms forward. |
| `custom_components/inventer_e16/client.py` | Standalone Python client (no HA imports). Handles socket, TLS-PSK callback, packet framing, CRC-8, DataObjectArray wrappers, and protocol commands. |
| `custom_components/inventer_e16/coordinator.py` | Data update coordinators: `E16ZoneCoordinator` (zone polling every 30s), `E16InfoCoordinator` (maintenance/device polling every 10 min, firmware catalog), `E16Data` container with `is_multi_zone` property. |
| `custom_components/inventer_e16/entity.py` | Base `E16Entity(CoordinatorEntity)`. Manages `unique_id` formatting (`<main>_<key>`, `<main>_z<zid>_<key>`, `<main>_<addr>_<key>`) and `device_info`. |
| `custom_components/inventer_e16/fan.py` | `E16Fan(E16Entity, FanEntity)`. Speed 1–4, presets `heat_recovery` / `ventilation`. Turn on restores profile (cmd 7); turn off applies unlimited pause (cmd 2 global or cmd 5 per-zone). Time program services (`get_time_program`, `set_time_program_entry`, `delete_time_program_entry`) and device services (`get_devices`, `set_device_zone`). |
| `custom_components/inventer_e16/button.py` | Quick action buttons: `boost` (15 min), `pause_1h` (1 h), `resume` (cancel override). In single-zone: sends global commands 1, 2, 7. In multi-zone: sends per-zone command 5 (speed 4 ventilation / speed 0 closed flap) or command 7 cancel. Maintenance reset buttons (`filter_reset`, `service_reset`). |
| `custom_components/inventer_e16/select.py` | Select entities: `E16Mode` (operating modes: `heat_recovery`, `ventilation`, `pause` closed flap, `pause_open` open flap via cmd 5), `E16Profile` (ventilation profiles 0–15, summer 252, cellar 253/254), `E16Interval` (filter/service timer months). |
| `custom_components/inventer_e16/number.py` | `E16Duration` (override duration 15–480 min), `E16ZoneSetting` (comfort temperature, humidity, CO2, VOC thresholds). |
| `custom_components/inventer_e16/sensor.py` | Telemetry: speed, playback, mode, timer, temperatures, humidities, dew points, absolute humidity, CO2, VOC, filter/service remaining time, battery level. |
| `custom_components/inventer_e16/binary_sensor.py` | `E16Problem`, `E16VentilationDries` (dew point moisture check), filter/service due flags, `E16RadioLost`, `E16BatteryLow`, `E16Alarm`. |
| `custom_components/inventer_e16/strings.json`, `translations/{en,de}.json` | UI entity names, service descriptions, and localized state values. |
| `docs/protocol.md` | Protocol specification: packet types, byte offsets, CRC-8, verified vs inferred flags, UserOverride command tables. |
| `README.md` | User documentation, installation instructions, Lovelace cards, multi-zone explanations. |
| `AGENTS.md` | Integration rules, coding guidelines, release checklist. |
| `tests/test_client.py` | Protocol unit tests without HA dependencies (`pytest tests --ignore=tests/ha`). |

---

## 3. Protocol & Mode Details

### Two Mode Tables (Critical!)
1. **Zone Status Table (Read):**
   - `0`: Off / Pause
   - `1`: Ventilation (Durchlüftung)
   - `2`: Heat Recovery (Wärmerückgewinnung)
2. **UserOverride Command 5 / Time Program Table (Write):**
   - `1`: Heat Recovery (`FAN_HEAT_RECOVERY`)
   - `2`: Ventilation (`FAN_VENTILATION`)
   - `3`: Pause, flap closed (`FAN_OFF`, speed = 0)
   - `4`: Pause, flap open (`FAN_STOP`, speed = 0)
   Conversion via `client.READ_MODE_TO_FAN` / `fan.PRESET_TO_FAN`.

### UserOverride Commands (`T_USER_OVERRIDE = 56`, 8-byte record)
- Cmd 1: `CMD_GLOBAL_BOOST` (speed 4, mode 2, zone 255, 900 s)
- Cmd 2: `CMD_GLOBAL_PAUSE` (speed 0, mode 3, zone 255, duration `0xFFFFFFFF`)
- Cmd 5: `CMD_ZONE_SPEED_MODE` (speed 0–4, mode 1–4, zone 1–4, duration seconds)
- Cmd 7: `CMD_CANCEL` (power on / resume profile)

---

## 4. Multi-Zone Review Items & Solution Summary

1. **MAX_ZONES = 4 & Phantom Zones Blocker:**
   - Physical e16 controllers only support up to 4 zones (indices 0–3). Indices 4–8 time out (10s delay each).
   - Single-zone controllers reply to indices 0–3 with empty names, profile 0, flags 4 for zones 2–4.
   - **Fix:** In `client.py`, set `MAX_ZONES = 4`. In `__init__.py`:
     - Run `await data.info.async_config_entry_first_refresh()` first to get device assignments.
     - Probe indices 0–3 in one TLS connection using `client.get_zones()`.
     - Zone 1 (index 0) is always active.
     - Zones 2–4 are considered active only if:
       - Assigned to at least one radio device (`zone_id in assigned_zones`), OR
       - Zone has a non-empty name (`bool(name.strip())`), OR
       - Zone was already registered in HA device registry (`known_registered_zones`).
     - Transient communication errors during setup raise `ConfigEntryNotReady` rather than silently dropping zones.

2. **Protocol Facts (`docs/protocol.md`):**
   - Documented verified facts for Command 5 with speed 0 and mode 3 (flap closed) and mode 4 (flap open) tested on firmware 5.30.10 / 5.30.11 with iV14-Zero and Twin+ vents.

3. **Multi-zone Buttons & README (`README.md`):**
   - Single-zone: Buttons trigger global commands 1, 2, 7.
   - Multi-zone: Each zone device has its own Boost (cmd 5, speed 4, mode 2, 15 min), Pause 1h (cmd 5, speed 0, mode 3, 1h), and Resume (cmd 7). Global commands are omitted to prevent accidental cross-zone overrides.

4. **German Translation (`translations/de.json`):**
   - Standardized `select.mode.state.ventilation` from `"Durchzug"` to `"Durchlüftung"`.

5. **`is_multi_zone` property:**
   - Consolidated `multi = len(...) > 1` into property `is_multi_zone` on `E16Data` and `E16ZoneCoordinator` (`coordinator.py`).

6. **Unneeded `__init__` overrides:**
   - Removed pass-through `__init__` in `E16Problem`, `E16Duration`, `E16Fan`, `E16Mode`, `E16Profile` as `E16Entity.__init__` already handles `zone_id`.

7. **Rule 8 in `AGENTS.md`:**
   - Added `<device_id>_z<zone>_<key>` to the list of unique ID formats.

