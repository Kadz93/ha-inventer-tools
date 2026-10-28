# Implementation Plan: inVENTer e16 Device & Zone Management Card

## Goal & Scope
Create a custom Lovelace card (similar to `inventer-e16-schedule-card.js`) that displays all detected devices (fans, sensors, controller) connected to the inVENTer Easy Connect e16 and allows assigning them to any configured zone. Implement the necessary backend services in the Home Assistant custom integration (`inventer_e16`) to support reading devices/zones and writing the device-to-zone mapping to the controller.

---

## Architecture & Protocol Details

### 1. Zirconia Protocol Schema for Devices
In the Zirconia protocol (TLS-PSK on TCP 47820):
- **Packet 140 (`DeviceRowField`)**: Used for writing/reading individual device attributes with `RawWithId` (`0x0ABA`, type 7).
  - Field ID calculation: `address * 65536 + field`.
  - `DF_NAME = 0`: Device name (up to 16 bytes UTF-8).
  - `DF_ZONE = 1`: Assigned Zone ID (`u8`, 1–8).
- **Packet 141 (`DeviceViewHeader`)**: Header row giving device count and version.
- **Packet 142 (`DeviceViewRow`)**: Full 45-byte device row telemetry (address, device type, hardware type, zone ID, status bits, signal dBm, firmware version, name, temperature, humidity, runtime, battery, etc.).
- **Packet 144 (`ZoneRowField`)**: Zone attributes (name, profile, comfort thresholds).
- **Packet 146 (`ZoneViewRow`)**: Zone status and telemetry.

### 2. Backend Services
Registered on the `fan` platform in `custom_components/inventer_e16/`:
- **`inventer_e16.get_devices`**:
  - `target`: `entity: integration: inventer_e16, domain: fan`
  - `fields`: `refresh` (boolean, optional)
  - `supports_response`: `SupportsResponse.ONLY`
  - Returns a dictionary with:
    - `devices`: List of all devices with address, name, type, type_name (e.g. `iV14-Zero`, `iV-Twin+`, `Indoor sensor`), hardware (1=Regler, 2=Lüfter, 3=Sensor), hardware_name, zone, zone_name, status, online (boolean), signal (dBm), firmware version, temperature, humidity, runtime, battery.
    - `zones`: List of all configured zones with `zone_id`, `name`, `speed`, `mode`.
- **`inventer_e16.set_device_zone`**:
  - `target`: `entity: integration: inventer_e16, domain: fan`
  - `fields`:
    - `address`: Integer (0–31), bus address of the device.
    - `zone`: Integer (1–8), zone ID to assign the device to.
  - `supports_response`: `SupportsResponse.OPTIONAL`
  - Dispatches to `E16InfoCoordinator.async_set_device_zone(address, zone)`.

### 3. Frontend Custom Lovelace Card
- Tag: `<inventer-e16-devices-card>`
- File locations (kept in sync):
  - `custom_components/inventer_e16/frontend/inventer-e16-devices-card.js`
  - `www/inventer-e16-devices-card.js`
- Registered in `window.customCards`:
  - `type`: `inventer-e16-devices-card`
  - `name`: `inVENTer e16 Geräte & Zonen`
  - `description`: `Erkannte Lüfter, Sensoren und Regler anzeigen und Zonen zuordnen`
- Visual Design & Features:
  - **Header**: Title, live device count ("6 Geräte in 4 Zonen"), refresh button with spin animation, status & error banners.
  - **Zone Overview Bar**:
    - Chips for each active zone (e.g. `Zone 1: Küwo (2)`, `Zone 2: Büro (2)`, `Zone 3: Tmp (1)`, `Zone 4: Schlafi (1)`).
    - Type filter chips: `Alle`, `Lüfter`, `Sensoren`, `Regler`.
  - **Device Cards**:
    - Icon reflecting device type (Fan animated/static, Thermometer/Sensor, Controller).
    - Device Name, Address (`#1`), Online/Offline status badge, RSSI signal badge (`-50 dBm`).
    - Model & Hardware badge (`iV14-Zero`, `iV-Twin+`, `Indoor Sensor`).
    - Telemetry metrics:
      - Temperature & Humidity (if available)
      - Battery percentage with color-coded level
      - Runtime in hours
      - Firmware version
    - **Zone Assignment Action**:
      - Current zone badge.
      - Interactive zone selector buttons for each zone.
      - Click calls `inventer_e16.set_device_zone`.
      - Optimistic UI update with spinner during call and success confirmation.
  - **Card Editor**:
    - `<inventer-e16-devices-card-editor>` for Lovelace UI editor support.

---

## Status of Tasks

- [x] **1. Client Protocol (`custom_components/inventer_e16/client.py`)**:
  - Added `T_DEVICE_FIELD = 140`.
  - Added `DF_NAME = 0, DF_ZONE = 1`.
  - Added `set_device_field(self, address, field, raw)`.
  - Added `set_device_zone(self, address, zone_id)`.
- [x] **2. Coordinator (`custom_components/inventer_e16/coordinator.py`)**:
  - Added `async_set_device_zone` to `E16InfoCoordinator`.
  - Optimistic update of local `info.data["devices"]` and background refresh.
- [x] **3. Fan Entity & Service Handlers (`custom_components/inventer_e16/fan.py`)**:
  - Registered `get_devices` service (`SupportsResponse.ONLY`).
  - Registered `set_device_zone` service (`SupportsResponse.OPTIONAL`).
  - Implemented `async_get_devices` and `async_set_device_zone` on `E16Fan`.
- [x] **4. Service Definitions (`custom_components/inventer_e16/services.yaml`)**:
  - Added definitions for `get_devices` and `set_device_zone`.
- [x] **5. English Translations (`custom_components/inventer_e16/strings.json`, `translations/en.json`)**:
  - Added strings for `get_devices` and `set_device_zone`.
- [x] **6. Frontend Registration (`custom_components/inventer_e16/__init__.py`)**:
  - Updated `_async_register_frontend` to register both `inventer-e16-schedule-card.js` and `inventer-e16-devices-card.js`.
- [x] **7. German Translations (`custom_components/inventer_e16/translations/de.json`)**:
  - Add German translations for `get_devices` and `set_device_zone`.
- [ ] **8. Custom Card Implementation**:
  - Create `custom_components/inventer_e16/frontend/inventer-e16-devices-card.js`.
  - Copy to `www/inventer-e16-devices-card.js`.
- [ ] **9. Protocol Documentation (`docs/protocol.md`)**:
  - Document packet 140 `DeviceRowField`.
- [ ] **10. Client Unit Tests (`tests/test_client.py`)**:
  - Add tests for `set_device_field` and `set_device_zone`.
- [ ] **11. Verification & Testing**:
  - Run `pytest tests --ignore=tests/ha`.
  - Verify all tests pass cleanly without errors or warnings.
