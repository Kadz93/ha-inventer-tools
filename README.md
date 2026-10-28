# Disclaimer

This is a fork, all credit for analyzing the protocol goes to the owner of the main repo.
This for may provide additional functionality that can later be merged into the main repo.
Testing environment is a multi zone setup with iv14zero and twin+ vents.

I am an experienced hardware technician and software dev but use 100% AI to code this in my spare time. (as well as the main repo i guess, no disclaimer but lots of agent mds etc)
I test everything on my own setup before releasing it into my main, bugs will appear :)

Additional features on this branch (`time-schedule-card`):
- **Multi-zone support:** Manage multi-zone setups, zone fans, statuses, and assign profiles per zone.
- **Support for all fan modes:** Full control over `heat_recovery`, `ventilation`, and both pause flap modes (`pause` flap closed, `pause_open` flap open).
- **Lovelace Custom Card (`inventer-e16-schedule-card`):** View, add, edit, and delete time schedule points across all standard and custom ventilation profiles (1–15).
- **Automated slot allocation:** During profile creation, free memory slots (Speicherplätze 0–31) are assigned automatically without requiring manual slot selection.
- **Controller pre-write sync:** The integration / card always pulls the schedule from the physical controller first before executing any write or delete operation.

> [!WARNING]
> **Wichtiger Warnhinweis zu Zeitplänen (Time Tables) / Important Warning:**
> Managing time schedules directly modifies the internal timetable memory of your inVENTer e16 controller. While the integration ensures that timetable data is always pulled from the controller first before anything is written and verifies every write back, **if you notice any issues, inconsistencies, or unexpected controller behavior with the timetables, immediately deactivate/disable this integration in Home Assistant** (*Settings → Devices & Services → inVENTer e16 → 3 dots → Disable*). Deactivating halts all communication so that the controller can run undisturbed and can be checked or restored via the official inVENTer app.

# inVENTer Easy Connect e16 for Home Assistant

Local control of inVENTer decentralised ventilation systems with the **Easy Connect e16**
controller – over your Wi-Fi, without the manufacturer's cloud.

> 🇩🇪 **Kurz auf Deutsch:** Diese Integration bindet eine **inVENTer-Lüftung** (dezentrale
> Wohnraumlüftung mit Wärmerückgewinnung) über den Regler **inVENTer Easy Connect e16** mit
> WLAN-Modul **lokal in Home Assistant** ein – ohne Cloud. Lüfterstufe, Wärmerückgewinnung oder
> Durchlüftung, Boost, Pause und Lüftungsprofil (z. B. Sommer, Keller) steuern; Temperatur,
> Luftfeuchte und Batterie der Funksensoren, Filterwechsel, Wartung und Firmware-Updates sehen.
> Getestet mit zwei Lüftern iV14-Zero sowie Innen- und Außensensor am Easy Connect e16; andere
> Lüfter am e16 sollten genauso funktionieren, sind aber nicht geprüft.
> Anleitung zum Koppeln auf Deutsch: [docs/onboarding.md](docs/onboarding.md#deutsch).

> **Unofficial.** This project is not affiliated with, endorsed or supported by inVENTer GmbH.
> "inVENTer" and "Easy Connect" are trademarks of their respective owner and are used here only
> to describe compatibility. Use at your own risk.

## Features

| Area | Entities |
|---|---|
| **Control** | Fan with speed 1–4 and modes *heat recovery* / *ventilation*; off = unlimited pause, on = resume the profile; buttons *Boost 15 min*, *Pause 1 h* and *Resume profile*; *command duration* 15 min–8 h |
| **Profile** | Select the ventilation profile (default, bedroom, …, summer, cellar heat recovery, cellar with ventilation) and its comfort settings (comfort temperature indoor/outdoor, humidity threshold; CO₂/VOC threshold with such a sensor) |
| Zone | Speed, playback, mode, timer, indoor/outdoor temperature and humidity, CO₂/VOC (if a sensor is present), system status, last command |
| **Humidity** | Dew point and absolute humidity indoor/outdoor, dew point difference, and *Ventilation dries* – whether outdoor air would actually remove moisture (useful for cellars) |
| **Maintenance** | Filter change and service: due date, days left, "due" flags from the controller, interval selection, *confirm* buttons |
| **Firmware** | Update entities for Wi-Fi module, controller, fans and sensors, compared against the manufacturer's firmware catalog (opt-in, see Privacy). Installing stays with the official app |
| Radio devices | Each fan and sensor as its own device: radio signal, runtime, temperature, humidity, battery; *battery low*, *radio device missing* and *alarm* flags |
| Diagnostics | Fan power per speed level and reversal interval (read only); downloadable diagnostics with PSK, host and device ID redacted |

For automations there is the service **`inventer_e16.set_mode`** (mode, speed, duration), e.g.
a pause that ends by itself:

```yaml
action: inventer_e16.set_mode
target:
  entity_id: fan.my_inventer
data:
  mode: pause          # heat_recovery | ventilation | pause | pause_open
  minutes: 30
```

Speed and mode are **time-limited commands** exactly like in the app: when the command duration
ends, the controller returns to its profile. Permanent changes are made through the profile.

**`inventer_e16.get_time_program`** returns the time program of a ventilation profile (default: the
current one; the automatic and cellar profiles have none) – read only for now:

```yaml
action: inventer_e16.get_time_program
target:
  entity_id: fan.my_inventer
data:
  profile: bedroom     # bedroom … holiday, custom_1 … custom_9
response_variable: program
```

Each entry has `time`, `days`, `mode` (as in `set_mode`) and `speed`.

**`inventer_e16.set_time_program_entry`** and **`delete_time_program_entry`** change one entry
(slot 0–31) of a profile's time program; every write is read back from the controller:

```yaml
action: inventer_e16.set_time_program_entry
target:
  entity_id: fan.my_inventer
data:
  profile: custom_1
  entry: 0
  time: "06:30"
  days: [monday, tuesday, wednesday, thursday, friday]
  mode: heat_recovery
  speed: 2
```

The change applies whenever that profile is active. Read the program first and keep a copy –
there is no undo.

### Lovelace Custom Card: Schedule Editor (Zeitplan-Editor)

The integration includes a built-in Lovelace custom card (`inventer-e16-schedule-card`) that allows you to view, add, edit, and delete time schedule points for all ventilation profiles directly in your Home Assistant dashboard:

> [!WARNING]
> **Warnhinweis (Wichtig):** Sollten Probleme oder Unregelmäßigkeiten mit den Zeitplänen (Time Tables) auf dem Regler auftreten, bitte die Integration vorübergehend in Home Assistant deaktivieren (*Einstellungen → Geräte & Dienste → inVENTer e16 → ⋮ → Deaktivieren*).

- **Profiles supported:** Standard profiles (*living_room / Wohnzimmer*, *bedroom / Schlafzimmer*, *childrens_room*, *bathroom*, *kitchen*, *holiday*) as well as all 9 custom profiles (*custom_1* to *custom_9* / *Benutzerdefiniertes Profil 1–9*).
- **Automated slot allocation:** Free memory slots (Speicherplätze 0–31) are assigned automatically when creating new entries; manual slot selection is not required.
- **Controller pre-write sync:** The card strictly pulls the current timetable from the controller first before allowing additions, modifications, or deletions to ensure controller data is always synchronized.
- **Days:** Any combination of weekdays (Monday through Sunday) with one-click presets (*Workdays Mon–Fri*, *Weekend Sat–Sun*, *All days*).
- **Start time:** Configurable in 24-hour time format (`HH:MM`).
- **Operating modes:**
  - 🔁 *Heat recovery* (`heat_recovery`, mode 1) – reversing airflow with thermal storage
  - 💨 *Ventilation / Cross-ventilation* (`ventilation`, mode 2) – unidirectional continuous flow
  - ⏸️ *Pause with flap closed* (`pause`, mode 3) – fans stopped, lid closed
  - 🪟 *Pause with flap open* (`pause_open`, mode 4) – fans stopped, lid open for passive airflow
- **Fan speed:** Levels 1 to 4 (automatically deactivated / set to 0 in pause modes).
- **Slot overview:** Visual overview of occupied slots (e.g. 5 / 32 entries used).

#### Prerequisites & Required Entities

The card communicates with the e16 controller by invoking the integration's native services through a **fan entity**:
- **Target entity:** The `fan.<zone_name>` entity created by this integration (e.g. `fan.inventer_living_room` or `fan.my_inventer`).
- **Auto-detection:** If `entity` is omitted in the card configuration, the card automatically searches for any `inventer_e16` fan entity.
- **Multi-zone setups:** Profiles and time schedules are stored centrally on the e16 controller. The card automatically detects all configured zones, displays which zones currently have the selected profile active, and lets you assign the profile to any zone with a single click.
- **Behind the scenes:** The card utilizes the integration services:
  - `inventer_e16.get_time_program` (fetches active slots from the controller)
  - `inventer_e16.set_time_program_entry` (stores/updates slot 0–31 on the controller)
  - `inventer_e16.delete_time_program_entry` (clears a slot from the controller)

#### Card Setup Guide

##### 1. Registration
The card is automatically registered and served by the integration at:
```
/inventer_e16/inventer-e16-schedule-card.js
```
After installing the integration and restarting Home Assistant, simply refresh your browser (or pull-to-refresh in the companion app).

*(Optional manual registration)*: If your setup uses dashboard YAML mode or doesn't auto-discover extra frontend URLs, go to **Settings → Dashboards → 3 dots (top right) → Resources → Add Resource**:
- **URL:** `/inventer_e16/inventer-e16-schedule-card.js`
- **Resource type:** `JavaScript Module`

##### 2. Adding to the Dashboard

**Via UI (Visual Card Editor):**
1. Open your dashboard, click **Edit Dashboard** (top right pencil icon).
2. Click **Add Card**.
3. Search for **inVENTer e16 Zeitplan** (or scroll down to custom cards).
4. Select your inVENTer Fan entity (or leave blank for automatic detection), choose a title and the default profile to open, then click **Save**.

**Via YAML:**

*Minimal configuration (automatic entity detection):*
```yaml
type: custom:inventer-e16-schedule-card
```

*Standard configuration:*
```yaml
type: custom:inventer-e16-schedule-card
title: inVENTer Zeitplan Wohnzimmer
entity: fan.inventer_living_room
default_profile: living_room
```

*Custom profile configuration (e.g. Custom Profile 1):*
```yaml
type: custom:inventer-e16-schedule-card
title: Mein Lüftungsplan
entity: fan.inventer_living_room
default_profile: custom_1
```

*Multi-zone dashboard example (side-by-side or stacked):*
```yaml
type: vertical-stack
cards:
  - type: custom:inventer-e16-schedule-card
    title: Zeitplan Zone 1 (Wohnzimmer)
    entity: fan.inventer_zone_1
    default_profile: living_room

  - type: custom:inventer-e16-schedule-card
    title: Zeitplan Zone 2 (Schlafzimmer)
    entity: fan.inventer_zone_2
    default_profile: bedroom
```

#### Configuration Options

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | string | **required** | `custom:inventer-e16-schedule-card` |
| `entity` | string | *auto-detect* | The `fan` entity ID of the inVENTer zone (e.g. `fan.inventer_living_room`). If omitted, automatically detects the first e16 fan. |
| `title` | string | `inVENTer e16 – Zeitpläne` | Custom title displayed in the card header. |
| `default_profile` | string | `living_room` | Profile selected by default when loading the card (`living_room`, `bedroom`, `childrens_room`, `bathroom`, `kitchen`, `holiday`, or `custom_1` .. `custom_9`). |

### Lovelace Custom Card: Device & Zone Management (Geräte- & Zonenverwaltung)

The integration also includes a Lovelace custom card (`inventer-e16-devices-card`) that displays all detected wireless devices (fans, temperature/humidity sensors, battery sensors, controller) and lets you assign them to any configured ventilation zone:

- **All detected devices at a glance:** View device names, bus addresses, models (`iV14-Zero`, `iV-Twin+`, `Indoor sensor`, etc.), online status, radio signal levels (dBm), battery levels, runtimes, and live telemetry.
- **Filter options:** Filter between All devices, Fans, Sensors, and Controller, or view devices belonging to a specific zone.
- **1-Click zone assignment:** Assign any fan or sensor to another zone using the interactive zone buttons. The card optimistically updates the assignment in the UI and synchronizes the change directly with the e16 controller via the `set_device_zone` service.
- **Auto-detection:** Automatically discovers configured zones and devices via native integration services (`get_devices` and `set_device_zone`).

#### Card Setup

Served automatically by the integration at:
```
/inventer_e16/inventer-e16-devices-card.js
```

Or add as a manual Lovelace resource if using YAML dashboards (`URL: /inventer_e16/inventer-e16-devices-card.js`, JavaScript Module).

**Card configuration in Lovelace dashboard:**

```yaml
type: custom:inventer-e16-devices-card
title: inVENTer e16 – Geräte & Zonen
```

| Option | Type | Default | Description |
|---|---|---|---|
| `type` | string | **required** | `custom:inventer-e16-devices-card` |
| `entity` | string | *auto-detect* | The `fan` entity ID of an inVENTer zone (e.g. `fan.inventer_living_room`). If omitted, automatically detects the first e16 fan. |
| `title` | string | `inVENTer e16 – Geräte & Zonen` | Custom title displayed in the card header. |


## Requirements

- Easy Connect e16 with Wi-Fi module, connected to your network (set up with the official app)
- Home Assistant 2026.9 or newer (Python ≥ 3.13 for TLS-PSK)
- Once: a computer with Bluetooth LE and Python, or a phone with a BLE app, to read the device key

## Installation

### 1. Read device ID and PSK (once)

The controller encrypts the local connection with a key that is individual per device. The app
never shows it, but the controller hands it out over Bluetooth while in pairing mode.
Step-by-step guide with troubleshooting: **[docs/onboarding.md](docs/onboarding.md)**
(also in German).
No computer at hand? It also works with a free Bluetooth app on your phone:
**[step by step with screenshots](docs/onboarding.md#without-python-a-ble-app-on-your-phone)**.

```bash
pip install -r tools/requirements.txt
# hold the mode button on the controller until the LED blinks blue, then:
python tools/e16_onboard.py scan
python tools/e16_onboard.py read            # or: read AA:BB:CC:DD:EE:FF
```

The tool prints the **device ID** and the **PSK**. It only reads – it does not change the
pairing with your app. Keep the PSK private: anyone on your network with it can control the
ventilation.

### 2. Install the integration

**HACS:** search for *inVENTer Easy Connect e16* in HACS, download it and restart Home Assistant.
Or open it directly:

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=tobiask1977&repository=ha-inventer-e16&category=integration)

**Manual:** copy `custom_components/inventer_e16` to `/config/custom_components/` and restart.

### 3. Add it

*Settings → Devices & services → Add integration → inVENTer Easy Connect e16*, then enter host,
device ID and PSK. Reserve the controller's IP address in your DHCP server.

Home Assistant usually finds the controller by itself ("Discovered: inVENTer Easy Connect e16") with host and
device ID already filled in – it announces itself as `Easy Connect e16-<device id>` or `noName-<device id>` – then only the PSK is needed. A new IP address is picked up automatically:
right away if Home Assistant sees the controller's DHCP traffic (same network), otherwise – through a router
integration such as UniFi device trackers – at the next Home Assistant start. Reserving the address avoids
the gap.

**Options:** polling interval of the zone status (15–3600 s, default 30 s; after a command the
status is read right away anyway) and the firmware check (see Privacy).

New IP address or key later (e.g. after a factory reset)? Use **Reconfigure** on the integration; if the
controller rejects the stored key, Home Assistant asks for the new one by itself.

## Privacy

Everything runs locally on TCP 47820. The only exception is the optional firmware check, **off by
default** since 0.3.14: switched on in the integration options, the integration asks the
manufacturer's firmware catalog (a Firebase function) once a day which versions are current. It
sends only the brand name `inventer`, but the manufacturer's cloud sees your public IP address and
the Home Assistant version. Without it, the firmware entities show the installed version only.
Installations set up before 0.3.14 keep the check switched on.

## Limitations

- Only the first zone of a controller is supported (multi-zone systems: please open an issue).
- Custom profiles cannot be created or renamed (their time programs can be edited).
- Firmware cannot be installed from Home Assistant.
- Tested with one installation (two fan units, indoor and outdoor sensor).

## How it works

See [docs/protocol.md](docs/protocol.md) for the packet formats and what has been verified on a
real device.

## Development

```bash
pip install pytest
pytest tests --ignore=tests/ha          # protocol tests, any OS
pip install pytest-homeassistant-custom-component
pytest tests/ha                         # config flow tests, Linux/macOS
```

The protocol client (`custom_components/inventer_e16/client.py`) has no Home Assistant
dependency and can be used on its own.

## License

Copyright (c) 2026 Tobias Krautkremer. Released under the [MIT License](LICENSE): you may use,
copy, modify and distribute this software, including commercially, as long as the copyright
notice and the license text are kept. Source files carry the identifier
`SPDX-License-Identifier: MIT`.

"inVENTer" and "Easy Connect" are trademarks of their respective owner. They are used only to
describe which devices this software works with; no endorsement is implied. This repository
contains no code, images, logos or other material of the manufacturer or its app. The icon in
`custom_components/inventer_e16/brand/` is an original design for this project (MIT).

## Disclaimer

This is an independent, unofficial project, provided **"as is", without warranty of any kind**
(see the [license](LICENSE)). It was developed by observing and analysing the device's
communication for interoperability and has been tested on a single installation only.

You use it **at your own risk**. In particular:

- Commands change how your ventilation runs. Wrong settings over a longer time can affect indoor
  air quality and humidity (risk of condensation and mould). Check the result.
- Using unofficial software may affect warranty or support claims against the manufacturer.
- The manufacturer can change firmware or cloud services at any time, which may break this
  integration without notice.

To the extent permitted by law, the authors are not liable for any damage to devices, buildings,
health or data, or for any other loss arising from the use of this software.

### Haftungsausschluss (Deutsch)

Dies ist ein unabhängiges, inoffizielles Projekt, das ohne jede Gewährleistung bereitgestellt
wird („wie besehen“, siehe [Lizenz](LICENSE)). Es entstand durch Beobachtung und Analyse der
Gerätekommunikation zum Zweck der Interoperabilität und wurde nur an einer einzigen Anlage
getestet. Die Nutzung erfolgt **auf eigene Gefahr**. Befehle verändern den Betrieb der Lüftung;
falsche Einstellungen über längere Zeit können Raumluft und Feuchte beeinträchtigen
(Kondensat- und Schimmelgefahr). Die Verwendung inoffizieller Software kann Gewährleistungs- oder
Supportansprüche gegenüber dem Hersteller berühren. Soweit gesetzlich zulässig, haften die
Autoren nicht für Schäden an Geräten, Gebäuden, Gesundheit oder Daten oder sonstige Schäden, die
aus der Nutzung entstehen; die gesetzliche Haftung für Vorsatz und grobe Fahrlässigkeit sowie für
Schäden aus der Verletzung von Leben, Körper oder Gesundheit bleibt unberührt.
