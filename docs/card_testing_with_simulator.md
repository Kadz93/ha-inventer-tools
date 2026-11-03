# Testing Lovelace Cards with `simulator.py`

This document evaluates how `tests/simulator.py` can be used to test the custom Lovelace frontend cards (`inventer-e16-schedule-card.js` and `inventer-e16-devices-card.js`), explains the architectural boundaries between the Python protocol simulator and the JavaScript cards, and outlines concrete test suites to improve card reliability.

---

## 1. Executive Summary

| Question | Answer |
|---|---|
| **Can card JavaScript talk directly to `simulator.py`?** | **No.** The Lovelace cards are frontend Web Components running in the browser. They communicate exclusively via Home Assistant's WebSocket and REST service API (`hass.callService`, `hass.connection.sendMessagePromise`). They do not speak the low-level binary Zirconia protocol (TLS-PSK on TCP 47820). |
| **Can `simulator.py` test the cards' backend pipeline?** | **Yes, 100%.** The services that power the cards (`get_time_program`, `set_time_program_entry`, `delete_time_program_entry`, `get_devices`, `set_device_zone`) execute in Home Assistant (`fan.py`), which calls `E16Client`. Running these services against `FakeController` validates the end-to-end data contract. |
| **Can `simulator.py` be used for live browser testing of cards?** | **Yes, with a lightweight TCP runner.** By exposing `FakeController` on a local TCP socket, developers can point a local test Home Assistant instance to `127.0.0.1` and visually test cards in the browser without touching a physical ventilation unit (complying with Rule 4 in `AGENTS.md`). |
| **What tests should we improve/add?** | 1. **Card Service Integration Tests** (`tests/ha/test_card_services.py`): Test all service endpoints invoked by the cards against `FakeController`.<br>2. **Simulator Extensions**: Add packet 140 (`DEVICE_ROW_FIELD`) support to `simulator.py` so `set_device_zone` works against the fake device.<br>3. **Frontend Component Tests**: Vitest/JSDOM tests for card UI rendering and state handling using realistic fixtures derived from `simulator.py`. |

---

## 2. Architecture & Data Flow

The cards do not connect to the physical or simulated controller directly. Instead, they interact with Home Assistant's entity state machine and custom services:

```mermaid
flowchart LR
    subgraph Browser / Frontend
        SC["inventer-e16-schedule-card.js"]
        DC["inventer-e16-devices-card.js"]
    end

    subgraph Home Assistant Backend
        WS["HA WebSocket & Service Layer"]
        FAN["custom_components/inventer_e16/fan.py<br>(get_time_program, get_devices, etc.)"]
        COORD["E16Coordinator & E16InfoCoordinator"]
        CLIENT["client.py (E16Client)"]
    end

    subgraph Simulation Layer
        SIM["tests/simulator.py<br>(FakeController)"]
    end

    SC -->|callService / sendMessagePromise| WS
    DC -->|callService / sendMessagePromise| WS
    WS --> FAN
    FAN --> COORD
    COORD --> CLIENT
    CLIENT -.->|mocked _connect()| SIM
```

Because of this architecture:
1. **Testing the Cards' Frontend UI**: Requires simulating the `hass` object (mock states, mock `callService`, mock `sendMessagePromise`) in a JavaScript test environment (e.g. Node.js with Vitest/Jest/JSDOM).
2. **Testing the Cards' Backend Contracts**: Requires executing Home Assistant service calls in Python where `E16Client` is wired to `FakeController`.

---

## 3. Card-by-Card Capability Analysis

### A. Schedule Card (`inventer-e16-schedule-card.js`)

#### Card Responsibilities
- Queries current weekly schedules for 15 profiles via `fan.get_time_program`.
- Displays up to 32 entries per profile (weekdays, start time, operating mode, fan speed).
- Creates/edits entries via `fan.set_time_program_entry`.
- Deletes entries via `fan.delete_time_program_entry`.
- Assigns profiles to zones via `select.select_option`.
- Enforces UI limits: 32-entry capacity check (`alert_full`), weekday bitmask parsing, collision indicators.

#### Status with `simulator.py`
- **Ready now:** `FakeController` fully models packet type 48 (`TIME_PROGRAM`).
  - Reading: Answers `DATA_REQUEST` with 8-byte program records plus CRC8.
  - Writing: Accepts `UPDATE` packets with 13-byte payloads, validates CRC8, and stores records in `self.programs[(table, entry)]`.
  - Capacity: Bounds check for `table < 15` and `entry < 32`.
  - Fault injection: Supports `store_programs=False` to simulate rejected writes.

---

### B. Device & Zone Management Card (`inventer-e16-devices-card.js`)

#### Card Responsibilities
- Queries device inventory via `fan.get_devices` (or WebSocket `sendMessagePromise`).
- Groups devices by zone (Controller, Fans, Sensors).
- Displays status chips: RSSI signal strength, battery %, runtime, firmware version, online/offline status.
- Reassigns a device to a different zone via `fan.set_device_zone`.
- Manages dynamic zone schedule rules via `fan.set_dynamic_device_zone` and `fan.delete_dynamic_device_zone`.

#### Status with `simulator.py`
- **Partially ready:**
  - **Reading devices:** Supported. `FakeController` answers `DEVICE_HEADER` (141) and `DEVICE_ROW` (142), returning realistic 45-byte device rows (Controller + 4 Fan units) created with `device_row()`.
  - **Reassigning device zones (`set_device_zone`):** **Not supported yet in `simulator.py`.**
    `client.py` writes to packet 140 (`T_DEVICE_FIELD` / `DF_ZONE = 1`). In `simulator.py`, packet 140 is missing from `WRITABLE_TYPES` and `_write_field`. Calling `set_device_zone` against `FakeController` currently triggers an `AssertionError`.
  - **Multi-zone representation:** `FakeController` currently defines only `zone_id = 1` for `ZONE_VIEW` (146) and `ZONE_FIELD` (144).

---

## 4. Tests to Add & Improve for the Cards

### Priority 1: Backend Service Tests for Cards (`tests/ha/test_card_services.py`)

Currently, `tests/ha/` contains no tests verifying that the custom entity services used by the cards return data adhering to the cards' JSON schema.

#### Test Cases to Implement:
1. **`test_card_get_time_program_empty_and_populated`**:
   - Initialize `FakeController` with 3 program entries.
   - Call service `fan.get_time_program` via HA `hass.services.async_call`.
   - Verify the returned response dictionary contains `profile`, `count`, and a list of formatted entries matching the schedule card's expectations (`entry`, `time`, `days`, `mode`, `speed`).
2. **`test_card_set_time_program_entry_lifecycle`**:
   - Call `fan.set_time_program_entry` to add entry #0 (Monday–Friday, 07:00, Heat Recovery, Speed 2).
   - Assert `FakeController.programs[(profile, 0)]` has the correct binary representation.
   - Call `fan.get_time_program` and verify the new entry is returned.
   - Call `fan.delete_time_program_entry` and verify entry #0 is zeroed out.
3. **`test_card_get_devices_format`**:
   - Call `fan.get_devices` against `FakeController`.
   - Verify each device dictionary contains all fields required by `inventer-e16-devices-card.js`:
     `address`, `name`, `type`, `type_name`, `hardware`, `hardware_name`, `zone`, `zone_name`, `online`, `signal`, `firmware`, `temperature`, `humidity`, `battery`.
4. **`test_card_services_error_handling`**:
   - Set `controller.store_programs = False` or `controller.drop_replies(1)`.
   - Call `fan.set_time_program_entry`.
   - Verify HA raises `HomeAssistantError` with a clean error message rather than unhandled socket exceptions.

---

### Priority 2: Simulator Extensions for Device Management

To allow end-to-end testing of `inventer-e16-devices-card.js`, update `tests/simulator.py`:

1. **Add Packet 140 (`DEVICE_FIELD`) to `WRITABLE_TYPES`**:
   ```python
   DEVICE_FIELD = 140
   WRITABLE_TYPES = {USER_OVERRIDE, GLOBAL_FIELD, ZONE_FIELD, TIME_PROGRAM, DEVICE_FIELD}
   ```
2. **Implement `_write_field` for `DEVICE_FIELD`**:
   - Unpack `address = field_id // 65536` and `field = field_id % 65536`.
   - When `field == 1` (`DF_ZONE`): Update byte 3 of the device's row in `self.devices[address]`.
   - When `field == 0` (`DF_NAME`): Update bytes 13..29 of the device's row.
3. **Add Multi-Zone Support**:
   - Allow `FakeController` to store and return multiple zone rows (e.g. Zone 1 and Zone 2) so device transfers between zones can be verified.

---

### Priority 3: Frontend Unit Tests (Node.js / Vitest)

To test the cards' JavaScript logic directly without running Home Assistant:

1. **Setup**:
   - Use Vitest with `happy-dom` or `jsdom`.
   - Import the card scripts.
2. **Mocking the `hass` Object**:
   - Construct a mock `hass` object mimicking Home Assistant's JavaScript interface:
     ```javascript
     const mockHass = {
       states: {
         "fan.inventer_zone_1": {
           state: "on",
           attributes: {
             preset_mode: "heat_recovery",
             percentage: 50,
             zone_id: 1,
             friendly_name: "Wohnzimmer Lüftung"
           }
         },
         "select.inventer_zone_1_profil": {
           state: "living_room",
           attributes: { options: ["living_room", "bedroom", "custom_1"] }
         }
       },
       callService: vi.fn(),
       connection: { sendMessagePromise: vi.fn() }
     };
     ```
3. **Unit Test Scenarios**:
   - **Render Test**: Assert card builds header, zone chips, and profile selectors without throwing errors.
   - **Day-Bitmask Formatter**: Verify days `[0, 1, 2, 3, 4]` render as `Mo–Fr` and `[5, 6]` as `Sa–So`.
   - **32-Entry Limit**: Feed 32 entries from mock data; verify the "+ Add" button is disabled and `alert_full` is displayed.
   - **Service Dispatch**: Click save on the time dialog; assert `callService` is called with exact service parameters (`profile`, `entry`, `time`, `days`, `mode`, `speed`).

---

### Priority 4: Standalone TCP Server for Interactive Testing

Add a CLI entrypoint to `tests/simulator.py` (or a helper `tools/run_simulator.py`) using `asyncio.start_server`:

```bash
# Start fake controller listening on port 47820
python tools/run_simulator.py --port 47820
```

#### Benefits:
- Developers can spin up a local Home Assistant test container or venv, configure the integration to connect to `127.0.0.1:47820`, and interactively tweak both cards in the browser.
- Allows rapid visual validation of CSS, animations, mobile responsiveness, and localization strings without needing access to a physical e16 controller.

