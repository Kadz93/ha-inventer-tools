# Implementation Plan: inVENTer e16 Dynamic Zones (Time-Based Device Zone Switching)

## Goal & Scope
Allow individual inVENTer e16 devices (primarily fans) to dynamically and temporarily switch to another ventilation zone based on a user-configured time schedule (e.g. switch Fan #2 to Zone 3 "Tmp/Abluft" from 22:00 to 07:00 to exhaust bedroom air, then return to Zone 1 "Schlafzimmer" in the morning).

Integrate this capability directly into the **Device Management Card** (`inventer-e16-devices-card.js`) with an intuitive "Dynamic" (⏱️) button on each device, backed by a persistent Home Assistant backend scheduler in the `inventer_e16` custom integration.

---

## Technical Context & Constraints
1. **Controller Hardware Limitation:** The inVENTer e16 controller firmware has internal schedules (packet 48) for zone *speed and mode* profiles, but does *not* support scheduled device-to-zone reassignments. Changing a device's zone requires sending `DeviceRowField DF_ZONE` (packet 140).
2. **Lovelace Client Limitation:** Lovelace frontend cards run in browser / mobile app memory. If the browser or phone is closed, client-side timers cease to execute.
3. **Home Assistant Backend Execution:** The timed zone switching must be executed on the Home Assistant backend via `homeassistant.helpers.event.async_track_time_change` (or event timers) and stored persistently in `homeassistant.helpers.storage.Store`.

---

## Architecture

### 1. Backend Module: `custom_components/inventer_e16/dynamic_zones.py`
- **Class `DynamicZoneManager`**:
  - `__init__(hass, entry, coordinator)`
  - `async_load()`: Loads rules from `homeassistant.helpers.storage.Store` (key `f"{DOMAIN}.{entry.entry_id}.dynamic_zones"`, version 1).
  - `async_save()`: Persists rules.
  - `async_start()`: Starts the minute-by-minute evaluation listener via `async_track_time_change(hass, self._async_check_schedule, second=0)`.
  - `async_stop()`: Cancels the time change listener upon entry unload.
  - `get_rule(address: int) -> dict | None`: Returns rule for a given device address.
  - `async_set_rule(address: int, target_zone: int, start_time: str, end_time: str, enabled: bool = True, weekdays: list[int] = None, original_zone: int | None = None)`: Sets or updates a rule.
  - `async_delete_rule(address: int)`: Deletes a dynamic zone rule and reverts the device if currently active.
  - `is_rule_active(rule: dict, now: datetime) -> bool`: Pure helper function supporting overnight windows (`start_time > end_time`) and weekday filtering (`0=Monday .. 6=Sunday`).
  - `_async_check_schedule(now: datetime)`: Runs every minute and applies transitions.

### 2. Integration Lifecyle Hooks
- In `custom_components/inventer_e16/coordinator.py`:
  - Add `dynamic_zones: "DynamicZoneManager | None" = None` to `E16Data`.
- In `custom_components/inventer_e16/__init__.py`:
  - In `async_setup_entry`: Initialize `data.dynamic_zones = DynamicZoneManager(hass, entry, data.info)`, call `await data.dynamic_zones.async_load()`, and call `data.dynamic_zones.async_start()`.
  - In `async_unload_entry`: Call `data.dynamic_zones.async_stop()` before unloading platforms.

### 3. Services Registered on Fan Platform (`custom_components/inventer_e16/fan.py`)
- **`inventer_e16.set_dynamic_device_zone`**:
  - Fields: `address` (0..31), `target_zone` (1..8), `start_time` (HH:MM), `end_time` (HH:MM), `enabled` (boolean, default true), `weekdays` (list of integers 0..6, optional, default all days), `original_zone` (optional).
  - Target: `entity: integration: inventer_e16, domain: fan`
  - Supports response: Optional.
- **`inventer_e16.delete_dynamic_device_zone`**:
  - Fields: `address` (0..31).
  - Target: `entity: integration: inventer_e16, domain: fan`
  - Supports response: Optional.
- **Update to `inventer_e16.get_devices`**:
  - In each device item, include `"dynamic_zone": data.dynamic_zones.get_rule(d["address"])` so the Lovelace card receives existing dynamic rules automatically on load/refresh.

### 4. Service Documentation & Translations
- Update `custom_components/inventer_e16/services.yaml` with schema and descriptions for `set_dynamic_device_zone` and `delete_dynamic_device_zone`.
- Update `strings.json`, `translations/en.json`, and `translations/de.json` with service names, descriptions, and field labels.

### 5. Frontend UI in `inventer-e16-devices-card.js`
- **Dynamic Button & Badge per Fan Device**:
  - Add a dynamic schedule icon/button (⏱️ / clock) next to each device (applicable to fans).
  - If a dynamic schedule is active or enabled, show an active badge: e.g. `⏱️ Zone 3 (22:00 – 07:00)` or highlight indicator.
- **Dynamic Zone Modal / Inline Dialog**:
  - Clicking the dynamic button opens a clean modal/dialog:
    - **Header**: "Dynamische Zone für [Gerätename]"
    - **Enable Switch**: Active / Inactive toggle.
    - **Target Zone**: Dropdown selector of available zones (excluding current original zone or highlighting target).
    - **Start Time**: `<input type="time">` (e.g. `22:00`).
    - **End Time**: `<input type="time">` (e.g. `07:00`).
    - **Weekdays**: 7 chip buttons (Mo, Di, Mi, Do, Fr, Sa, So) with quick presets: *Alle Tage*, *Mo–Fr*, *Sa–So*.
    - **Actions**:
      - "Speichern" (Calls `set_dynamic_device_zone`).
      - "Löschen" (Calls `delete_dynamic_device_zone` if rule exists).
      - "Abbrechen" (Closes dialog).
  - Keep `custom_components/inventer_e16/frontend/inventer-e16-devices-card.js` and `www/inventer-e16-devices-card.js` synchronized.

---

## Step-by-Step Implementation Roadmap

- [x] **Step 1: Backend Dynamic Zone Manager (`custom_components/inventer_e16/dynamic_zones.py`)**
  - Implement schedule calculation (handling overnight intervals and weekday filtering).
  - Implement storage load/save.
  - Implement minute scheduler listener with transition logging and error handling.
- [x] **Step 2: Integration Lifecycle Hooks (`coordinator.py`, `__init__.py`)**
  - Attach `DynamicZoneManager` to `E16Data`.
  - Start on entry setup, stop on entry unload.
- [x] **Step 3: Services & API (`fan.py`, `services.yaml`)**
  - Register `set_dynamic_device_zone` and `delete_dynamic_device_zone`.
  - Extend `get_devices` to return `dynamic_zone` for each device.
- [x] **Step 4: Translations (`strings.json`, `translations/en.json`, `translations/de.json`)**
  - Add service texts in German and English.
- [x] **Step 5: Frontend Card UI (`inventer-e16-devices-card.js`)**
  - Add dynamic button, status badges, and dynamic schedule editor dialog.
  - Sync with `www/inventer-e16-devices-card.js` (if present).
- [x] **Step 6: Unit Tests (`tests/test_dynamic_zones.py`)**
  - Test `is_rule_active` for normal day intervals, overnight intervals, and weekday boundaries.
  - Test schedule transitions and edge cases.
- [x] **Step 7: Verification & Test Suite Execution**
  - Run `pytest tests --ignore=tests/ha` to ensure 100% green tests and no regressions.

