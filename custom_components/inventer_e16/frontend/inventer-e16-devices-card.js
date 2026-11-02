// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Markus Hennig
/**
 * inVENTer Easy Connect e16 - Lovelace Devices & Zone Management Card
 * 
 * Displays all detected wireless devices (fans, sensors, controller)
 * and allows assigning them to any configured zone.
 */

/**
 * Escape a string for safe insertion into HTML markup or attribute values.
 * @param {*} text
 * @returns {string}
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ICONS = {
  fan: `<svg viewBox="0 0 24 24" class="dev-icon"><path fill="currentColor" d="M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0-9C7.03 2 3 6.03 3 11c0 2.12.74 4.07 1.97 5.61L4.35 18H2v2h3.35l.86 1.49A9.95 9.95 0 0 0 12 22c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9zm0 18c-3.15 0-5.9-1.84-7.21-4.52l2.36-.63a5.98 5.98 0 0 1 4.85 2.15v3zm-4.73-7.5c-.17-.47-.27-.97-.27-1.5 0-2.48 2.02-4.5 4.5-4.5.34 0 .67.04 1 .11V5.7a7.99 7.99 0 0 0-6.19 5.86l.96.94zm9.46 0l.96-.94A7.99 7.99 0 0 0 11.5 5.7v2.91c.33-.07.66-.11 1-.11 2.48 0 4.5 2.02 4.5 4.5 0 .53-.1 1.03-.27 1.5zm-2.25 4.52C13.16 16.52 11.63 17 10 17v3c2.45 0 4.67-.99 6.28-2.6l-1.8-1.38z"/></svg>`,
  sensor: `<svg viewBox="0 0 24 24" class="dev-icon"><path fill="currentColor" d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0m-3-9a1 1 0 0 1 1 1v3h-2V5a1 1 0 0 1 1-1Z"/></svg>`,
  controller: `<svg viewBox="0 0 24 24" class="dev-icon"><path fill="currentColor" d="M4 6h16v12H4V6m2 2v2h2V8H6m0 3v2h2v-2H6m0 3v2h2v-2H6m4-6v2h8V8h-8m0 3v2h8v-2h-8m0 3v2h8v-2h-8Z"/></svg>`,
  signal: `<svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.4 1.4 4.5 3.6 5.8L4.5 21l4.9-2.5c.8.2 1.7.3 2.6.3 5.5 0 10-3.5 10-7.8S17.5 3 12 3zm1 12h-2v-2h2v2zm0-4h-2V7h2v4z"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M16 20H8V6h8m0-2h-1V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" class="action-icon"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  zone: `<svg viewBox="0 0 24 24" class="zone-icon"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>`,
  checkmark: `<svg viewBox="0 0 24 24" class="status-icon"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm0-18a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm.5 5v5.25l4.5 2.67-.75 1.23-5.25-3.15V7h1.5z"/></svg>`,
  close: `<svg viewBox="0 0 24 24" class="action-icon"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>`
};

const STRINGS = {
  card_title: { de: "inVENTer e16 – Geräte & Zonen", en: "inVENTer e16 – Devices & Zones" },
  subtitle: {
    de: (d, z) => `${d} erkannte Geräte in ${z} Zonen`,
    en: (d, z) => `${d} detected device(s) in ${z} zone(s)`
  },
  refresh_title: { de: "Vom Regler aktualisieren", en: "Refresh from controller" },
  filter_all: { de: "Alle", en: "All" },
  filter_fan: { de: "Lüfter", en: "Fans" },
  filter_sensor: { de: "Sensoren", en: "Sensors" },
  filter_controller: { de: "Regler", en: "Controllers" },
  all_zones: { de: "Alle Zonen", en: "All zones" },
  empty_loading: { de: "Lade Geräte...", en: "Loading devices..." },
  empty_none: { de: "Keine Geräte für die gewählte Filterung gefunden.", en: "No devices found for the selected filter." },
  signal_level: { de: "Signalpegel", en: "Signal level" },
  temperature: { de: "Temperatur", en: "Temperature" },
  humidity: { de: "Luftfeuchtigkeit", en: "Humidity" },
  battery_status: { de: "Batteriestatus", en: "Battery status" },
  runtime: { de: "Betriebsstunden", en: "Runtime" },
  firmware_version: { de: "Firmware Version", en: "Firmware version" },
  assigned_zone: { de: "Zugewiesene Zone:", en: "Assigned zone:" },
  assign_title: {
    de: (addr, name) => `Gerät #${addr} Zone '${name}' zuweisen`,
    en: (addr, name) => `Assign device #${addr} to zone '${name}'`
  },
  err_fetch: { de: "Fehler beim Laden der Geräte: ", en: "Error loading devices: " },
  status_pre_assign: { de: "Lade aktuellen Gerätestand vom Regler vor der Änderung...", en: "Loading current device state from controller before change..." },
  err_pre_assign: { de: "Fehler: Gerätedaten konnten nicht vom Regler abgerufen werden. Änderung abgebrochen.", en: "Error: Could not retrieve device data from controller. Change cancelled." },
  status_assigning: {
    de: (addr, zone) => `Weise Gerät #${addr} Zone ${zone} zu...`,
    en: (addr, zone) => `Assigning device #${addr} to zone ${zone}...`
  },
  status_assigned: {
    de: (addr, zone) => `Gerät #${addr} erfolgreich Zone ${zone} zugewiesen!`,
    en: (addr, zone) => `Device #${addr} successfully assigned to zone ${zone}!`
  },
  err_assign: { de: "Fehler beim Zuweisen: ", en: "Error assigning: " },
  dynamic_btn_title: { de: "Dynamische Zone (Zeitsteuerung) konfigurieren", en: "Configure dynamic zone (time schedule)" },
  dynamic_badge: {
    de: (zoneLabel, s, e) => `Dynamisch: ${zoneLabel} (${s}–${e})`,
    en: (zoneLabel, s, e) => `Dynamic: ${zoneLabel} (${s}–${e})`
  },
  dynamic_badge_active: {
    de: (zoneLabel, s, e) => `⚡ Aktiv in ${zoneLabel} (${s}–${e})`,
    en: (zoneLabel, s, e) => `⚡ Active in ${zoneLabel} (${s}–${e})`
  },
  dynamic_btn_add: { de: "+ Dynamisch", en: "+ Dynamic" },
  dynamic_modal_title: {
    de: (name) => `Dynamische Zone: ${name}`,
    en: (name) => `Dynamic zone: ${name}`
  },
  dynamic_modal_desc: {
    de: "Wechselt das Gerät zeitgesteuert vorübergehend in eine andere Zone (z. B. nachts zum Lüften) und kehrt danach automatisch in die Standard-Zone zurück.",
    en: "Temporarily switches this device to another zone based on a time schedule, then automatically returns to its standard zone."
  },
  dynamic_enabled: { de: "Dynamische Umschaltung aktiv", en: "Dynamic switching enabled" },
  dynamic_target_zone_label: { de: "Ziel-Zone (während Zeitfenster):", en: "Target zone (during time window):" },
  dynamic_start_time_label: { de: "Startzeit:", en: "Start time:" },
  dynamic_end_time_label: { de: "Endzeit (Rückkehr):", en: "End time (return):" },
  dynamic_weekdays_label: { de: "Gültige Wochentage:", en: "Active weekdays:" },
  quick_workdays: { de: "Mo–Fr", en: "Mon–Fri" },
  quick_weekend: { de: "Sa–So", en: "Sat–Sun" },
  quick_all: { de: "Alle Tage", en: "All days" },
  btn_save: { de: "Speichern", en: "Save" },
  btn_cancel: { de: "Abbrechen", en: "Cancel" },
  btn_delete_rule: { de: "Zeitplan löschen", en: "Delete schedule" },
  status_dynamic_saving: { de: "Speichere dynamische Zone...", en: "Saving dynamic zone schedule..." },
  status_dynamic_saved: { de: "Dynamische Zone erfolgreich gespeichert!", en: "Dynamic zone saved successfully!" },
  status_dynamic_deleted: { de: "Dynamische Zone gelöscht.", en: "Dynamic zone schedule deleted." },
  err_dynamic_save: { de: "Fehler beim Speichern der dynamischen Zone: ", en: "Error saving dynamic zone: " },
  editor_title: { de: "Kartentitel", en: "Card title" },
  editor_entity: { de: "Lüfter-Entität (optional, sonst Auto-Erkennung)", en: "Fan entity (optional, auto-detected if blank)" },
};

class InventerE16DevicesCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {
      title: "inVENTer e16 – Geräte & Zonen",
      entity: ""
    };
    this._devices = [];
    this._zones = [];
    this._filterType = "all"; // 'all', 'fan', 'sensor', 'controller'
    this._filterZone = 0; // 0 for all zones
    this._loading = false;
    this._refreshing = false;
    this._assigningAddress = null;
    this._errorMessage = "";
    this._statusMessage = "";
    this._initialFetchDone = false;
    this._hasPulled = false;
    this._editingDynamicAddress = null;
    this._dynamicForm = null;
  }

  _t(key, ...args) {
    const lang = (this._hass?.locale?.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
    const item = STRINGS[key];
    if (!item) return key;
    const val = item[lang] || item["de"];
    if (typeof val === "function") {
      return val(...args);
    }
    return val;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialFetchDone && hass) {
      const entityId = this._getTargetEntity();
      if (entityId) {
        this._initialFetchDone = true;
        this._fetchDevices();
      }
    }
  }

  setConfig(config) {
    this._config = {
      title: "inVENTer e16 – Geräte & Zonen",
      entity: "",
      ...(config || {})
    };
    this._render();
  }

  getCardSize() {
    return 6;
  }

  static async getConfigElement() {
    return document.createElement("inventer-e16-devices-card-editor");
  }

  static getStubConfig() {
    return {
      title: "inVENTer e16 – Geräte & Zonen",
      entity: ""
    };
  }

  _getTargetEntity() {
    if (this._config && this._config.entity) {
      return this._config.entity;
    }
    return this._autoDetectEntity();
  }

  _autoDetectEntity() {
    if (!this._hass) return "";
    const fanEntities = Object.keys(this._hass.states || {}).filter((id) => {
      if (!id.startsWith("fan.")) return false;
      const state = this._hass.states[id];
      if (!state || !state.attributes) return false;
      const modes = state.attributes.preset_modes || [];
      return modes.includes("heat_recovery") && modes.includes("ventilation");
    });
    if (fanEntities.length > 0) return fanEntities[0];
    const namedEntities = Object.keys(this._hass.states || {}).filter(
      (id) => id.startsWith("fan.") && id.toLowerCase().includes("inventer")
    );
    return namedEntities.length > 0 ? namedEntities[0] : "";
  }

  async _fetchDevices(forceRefresh = false) {
    const entityId = this._getTargetEntity();
    if (!entityId || !this._hass) return;

    this._loading = true;
    if (forceRefresh) this._refreshing = true;
    this._errorMessage = "";
    this._render();

    try {
      let res = null;
      if (this._hass.connection && this._hass.connection.sendMessagePromise) {
        res = await this._hass.connection.sendMessagePromise({
          type: "call_service",
          domain: "inventer_e16",
          service: "get_devices",
          target: { entity_id: entityId },
          service_data: { refresh: forceRefresh },
          return_response: true
        });
      } else {
        res = await this._hass.callService(
          "inventer_e16",
          "get_devices",
          { refresh: forceRefresh },
          { entity_id: entityId }
        );
      }

      // The WebSocket call_service response nests the data under
      // response.<entity_id> for entity-targeted services.
      let data = null;
      if (res && res.response) {
        const resp = res.response;
        // Check if the response is keyed by entity_id (HA standard for entity services)
        if (resp[entityId]) {
          data = resp[entityId];
        } else if (resp.devices) {
          // Direct response (older HA or callService fallback)
          data = resp;
        } else {
          // Try to grab the first entity key that has a devices array
          const keys = Object.keys(resp);
          for (const key of keys) {
            if (resp[key] && resp[key].devices) {
              data = resp[key];
              break;
            }
          }
        }
      } else if (res && res.devices) {
        data = res;
      }
      if (data && data.devices) {
        this._devices = data.devices || [];
        this._zones = data.zones || [];
        this._hasPulled = true;
      }
    } catch (err) {
      console.error("Error loading devices:", err);
      this._errorMessage = this._t("err_fetch") + (err.message || err);
    } finally {
      this._loading = false;
      this._refreshing = false;
      this._render();
    }
  }

  async _setDeviceZone(address, newZoneId) {
    const entityId = this._getTargetEntity();
    if (!entityId || !this._hass) return;

    // Ensure device data has been fetched from controller at least once before making changes
    if (!this._hasPulled) {
      this._loading = true;
      this._statusMessage = this._t("status_pre_assign");
      this._render();
      await this._fetchDevices(true);
      if (!this._hasPulled) {
        this._errorMessage = this._t("err_pre_assign");
        this._loading = false;
        this._render();
        return;
      }
    }

    this._assigningAddress = address;
    this._errorMessage = "";
    this._statusMessage = this._t("status_assigning", address, newZoneId);

    // Optimistic UI update
    const dev = this._devices.find((d) => d.address === address);
    const oldZoneId = dev ? dev.zone : null;
    if (dev) {
      dev.zone = newZoneId;
      const targetZone = this._zones.find((z) => z.zone_id === newZoneId);
      dev.zone_name = targetZone ? targetZone.name : `Zone ${newZoneId}`;
    }
    this._render();

    try {
      await this._hass.callService(
        "inventer_e16",
        "set_device_zone",
        {
          address: parseInt(address, 10),
          zone: parseInt(newZoneId, 10)
        },
        { entity_id: entityId }
      );

      const successMsg = this._t("status_assigned", address, newZoneId);
      this._statusMessage = successMsg;
      setTimeout(() => {
        if (this._statusMessage === successMsg) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      // Refresh from controller after successful change
      await this._fetchDevices(true);
    } catch (err) {
      console.error("Error assigning zone:", err);
      this._errorMessage = this._t("err_assign") + (err.message || err);
      if (dev && oldZoneId !== null) {
        dev.zone = oldZoneId;
        const oldZone = this._zones.find((z) => z.zone_id === oldZoneId);
        dev.zone_name = oldZone ? oldZone.name : `Zone ${oldZoneId}`;
      }
    } finally {
      this._assigningAddress = null;
      this._render();
    }
  }

  _openDynamicDialog(address) {
    const dev = this._devices.find((d) => d.address === address);
    if (!dev) return;
    const existing = dev.dynamic_zone;
    const otherZone = this._zones.find((z) => z.zone_id !== dev.zone);
    const fallbackTarget = otherZone ? otherZone.zone_id : (dev.zone === 1 ? 2 : 1);

    this._dynamicForm = {
      address: address,
      enabled: existing ? existing.enabled !== false : true,
      target_zone: existing ? existing.target_zone : fallbackTarget,
      original_zone: existing ? existing.original_zone : dev.zone,
      start_time: existing ? existing.start_time : "22:00",
      end_time: existing ? existing.end_time : "07:00",
      weekdays: existing && Array.isArray(existing.weekdays) ? [...existing.weekdays] : [0, 1, 2, 3, 4, 5, 6],
      hasExisting: Boolean(existing)
    };
    this._editingDynamicAddress = address;
    this._errorMessage = "";
    this._render();
  }

  _closeDynamicDialog() {
    this._editingDynamicAddress = null;
    this._dynamicForm = null;
    this._render();
  }

  async _saveDynamicZone() {
    if (!this._dynamicForm || !this._hass) return;
    const entityId = this._getTargetEntity();
    if (!entityId) return;

    const form = this._dynamicForm;
    this._loading = true;
    this._statusMessage = this._t("status_dynamic_saving");
    this._render();

    try {
      await this._hass.callService(
        "inventer_e16",
        "set_dynamic_device_zone",
        {
          address: parseInt(form.address, 10),
          target_zone: parseInt(form.target_zone, 10),
          start_time: form.start_time,
          end_time: form.end_time,
          enabled: Boolean(form.enabled),
          weekdays: form.weekdays
        },
        { entity_id: entityId }
      );

      const successMsg = this._t("status_dynamic_saved");
      this._statusMessage = successMsg;
      setTimeout(() => {
        if (this._statusMessage === successMsg) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      this._editingDynamicAddress = null;
      this._dynamicForm = null;
      await this._fetchDevices(true);
    } catch (err) {
      console.error("Error saving dynamic zone:", err);
      this._errorMessage = this._t("err_dynamic_save") + (err.message || err);
      this._render();
    } finally {
      this._loading = false;
      this._render();
    }
  }

  async _deleteDynamicZone() {
    if (!this._dynamicForm || !this._hass) return;
    const entityId = this._getTargetEntity();
    if (!entityId) return;

    const addr = this._dynamicForm.address;
    this._loading = true;
    this._render();

    try {
      await this._hass.callService(
        "inventer_e16",
        "delete_dynamic_device_zone",
        {
          address: parseInt(addr, 10)
        },
        { entity_id: entityId }
      );

      const successMsg = this._t("status_dynamic_deleted");
      this._statusMessage = successMsg;
      setTimeout(() => {
        if (this._statusMessage === successMsg) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      this._editingDynamicAddress = null;
      this._dynamicForm = null;
      await this._fetchDevices(true);
    } catch (err) {
      console.error("Error deleting dynamic zone:", err);
      this._errorMessage = this._t("err_dynamic_save") + (err.message || err);
      this._render();
    } finally {
      this._loading = false;
      this._render();
    }
  }

  _getFilteredDevices() {
    return this._devices.filter((dev) => {
      // Type filter
      if (this._filterType === "fan" && dev.hardware !== 2) return false;
      if (this._filterType === "sensor" && dev.hardware !== 3) return false;
      if (this._filterType === "controller" && dev.hardware !== 1) return false;

      // Zone filter
      if (this._filterZone > 0 && dev.zone !== this._filterZone) return false;

      return true;
    });
  }

  _render() {
    const root = this.shadowRoot;
    if (!root) return;

    const cardTitle = this._config && this._config.title ? this._config.title : this._t("card_title");
    const filtered = this._getFilteredDevices();
    const fanCount = this._devices.filter((d) => d.hardware === 2).length;
    const sensorCount = this._devices.filter((d) => d.hardware === 3).length;
    const controllerCount = this._devices.filter((d) => d.hardware === 1).length;

    root.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          padding: 16px;
          background: var(--ha-card-background, var(--card-background-color, #fff));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0,0,0,0.1));
          color: var(--primary-text-color, #212121);
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
          position: relative;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .title-area {
          display: flex;
          flex-direction: column;
        }
        .title {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--primary-text-color, #212121);
        }
        .subtitle {
          font-size: 0.82rem;
          color: var(--secondary-text-color, #757575);
          margin-top: 2px;
        }
        .header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .icon-btn {
          background: transparent;
          border: none;
          color: var(--secondary-text-color, #757575);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s, transform 0.2s;
        }
        .icon-btn:hover {
          background-color: var(--secondary-background-color, rgba(0,0,0,0.05));
          color: var(--primary-color, #03a9f4);
        }
        .icon-btn.spinning svg {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .action-icon {
          width: 20px;
          height: 20px;
        }
        .banner {
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .banner.error {
          background-color: var(--error-color, #f44336);
          color: #fff;
        }
        .banner.status {
          background-color: var(--info-color, #03a9f4);
          color: #fff;
        }

        /* Filter Chips Bar */
        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 16px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          background-color: var(--secondary-background-color, rgba(0,0,0,0.05));
          color: var(--secondary-text-color, #616161);
          border: 1px solid transparent;
          transition: all 0.2s ease;
        }
        .chip:hover {
          background-color: var(--divider-color, #e0e0e0);
        }
        .chip.active {
          background-color: var(--primary-color, #03a9f4);
          color: #fff;
        }

        /* Zones summary row */
        .zones-summary {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }
        .zone-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.78rem;
          background-color: var(--card-background-color, #f5f5f5);
          border: 1px solid var(--divider-color, #e0e0e0);
          color: var(--primary-text-color, #212121);
          cursor: pointer;
        }
        .zone-chip:hover {
          border-color: var(--primary-color, #03a9f4);
        }
        .zone-chip.active {
          background-color: rgba(3, 169, 244, 0.12);
          border-color: var(--primary-color, #03a9f4);
          color: var(--primary-color, #0288d1);
          font-weight: 600;
        }
        .zone-icon {
          width: 14px;
          height: 14px;
        }

        /* Devices Grid */
        .devices-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 12px;
        }
        .device-card {
          background-color: var(--ha-card-background, var(--card-background-color, #fff));
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          transition: transform 0.15s, box-shadow 0.15s;
          position: relative;
        }
        .device-card:hover {
          box-shadow: 0 3px 8px rgba(0,0,0,0.1);
        }
        .device-card.saving {
          opacity: 0.6;
          pointer-events: none;
        }

        /* Device Header */
        .device-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .device-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(3, 169, 244, 0.1);
          color: var(--primary-color, #03a9f4);
          flex-shrink: 0;
        }
        .device-icon-box.fan {
          background-color: rgba(255, 152, 0, 0.12);
          color: #ff9800;
        }
        .device-icon-box.sensor {
          background-color: rgba(76, 175, 80, 0.12);
          color: #4caf50;
        }
        .device-icon-box.controller {
          background-color: rgba(156, 39, 176, 0.12);
          color: #9c27b0;
        }
        .dev-icon {
          width: 22px;
          height: 22px;
        }
        .device-header-info {
          flex: 1;
          min-width: 0;
        }
        .device-name-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .device-name {
          font-size: 0.95rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .addr-badge {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 4px;
          background-color: var(--secondary-background-color, rgba(0,0,0,0.08));
          color: var(--secondary-text-color, #616161);
        }
        .device-model {
          font-size: 0.78rem;
          color: var(--secondary-text-color, #757575);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Status & Badges */
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .status-dot.online {
          background-color: #4caf50;
          box-shadow: 0 0 5px rgba(76, 175, 80, 0.6);
        }
        .status-dot.offline {
          background-color: #f44336;
        }

        /* Metrics Grid */
        .metrics-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 0.76rem;
        }
        .metric-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          border-radius: 4px;
          background-color: var(--secondary-background-color, rgba(0,0,0,0.04));
          color: var(--primary-text-color, #333);
        }
        .badge-icon {
          width: 13px;
          height: 13px;
          color: var(--secondary-text-color, #757575);
        }

        /* Zone Assignment Section */
        .zone-assign-box {
          margin-top: 2px;
          padding-top: 8px;
          border-top: 1px dashed var(--divider-color, #e0e0e0);
        }
        .zone-assign-label {
          font-size: 0.74rem;
          font-weight: 500;
          color: var(--secondary-text-color, #757575);
          margin-bottom: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .current-zone-name {
          font-weight: 600;
          color: var(--primary-color, #03a9f4);
        }
        .zone-btn-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .zone-btn {
          background: var(--card-background-color, #f5f5f5);
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          color: var(--primary-text-color, #333);
          transition: all 0.15s;
        }
        .zone-btn:hover {
          border-color: var(--primary-color, #03a9f4);
          background-color: rgba(3, 169, 244, 0.05);
        }
        .zone-btn.active {
          background-color: var(--primary-color, #03a9f4);
          color: #fff;
          border-color: var(--primary-color, #03a9f4);
          font-weight: 600;
        }

        /* Dynamic Zone Row & Button */
        .dynamic-zone-row {
          display: flex;
          align-items: center;
          margin-top: 6px;
        }
        .dynamic-schedule-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.73rem;
          font-weight: 500;
          border: 1px dashed var(--divider-color, #ccc);
          background-color: transparent;
          color: var(--secondary-text-color, #616161);
          cursor: pointer;
          transition: all 0.15s;
        }
        .dynamic-schedule-btn:hover {
          border-color: var(--primary-color, #03a9f4);
          color: var(--primary-color, #03a9f4);
          background-color: rgba(3, 169, 244, 0.05);
        }
        .dynamic-schedule-btn.configured {
          border-style: solid;
          border-color: rgba(3, 169, 244, 0.5);
          background-color: rgba(3, 169, 244, 0.08);
          color: var(--primary-color, #0288d1);
          font-weight: 600;
        }
        .dynamic-schedule-btn.active {
          border-style: solid;
          border-color: #ff9800;
          background-color: rgba(255, 152, 0, 0.12);
          color: #e65100;
          font-weight: 600;
        }
        .dynamic-schedule-btn .badge-icon {
          width: 14px;
          height: 14px;
        }

        /* Modal Dialog */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          box-sizing: border-box;
        }
        .modal-card {
          background-color: var(--ha-card-background, var(--card-background-color, #fff));
          color: var(--primary-text-color, #212121);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          width: 100%;
          max-width: 440px;
          box-sizing: border-box;
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
          padding-bottom: 8px;
        }
        .modal-title {
          font-size: 1.05rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .modal-desc {
          font-size: 0.82rem;
          color: var(--secondary-text-color, #757575);
          line-height: 1.35;
        }
        .modal-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .modal-row.horizontal {
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
        }
        .modal-label {
          font-size: 0.83rem;
          font-weight: 600;
          color: var(--primary-text-color, #333);
        }
        .modal-input, .modal-select {
          padding: 7px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 0.9rem;
          font-family: inherit;
        }
        .modal-time-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .days-chips-row {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .day-chip {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #f5f5f5);
          color: var(--secondary-text-color, #616161);
          transition: all 0.15s;
        }
        .day-chip.active {
          background: var(--primary-color, #03a9f4);
          color: #fff;
          border-color: var(--primary-color, #03a9f4);
        }
        .quick-days-row {
          display: flex;
          gap: 6px;
          margin-top: 2px;
        }
        .quick-btn {
          font-size: 0.72rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: transparent;
          border: 1px dashed var(--divider-color, #bbb);
          color: var(--secondary-text-color, #757575);
          cursor: pointer;
        }
        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-top: 6px;
          padding-top: 10px;
          border-top: 1px solid var(--divider-color, #e0e0e0);
        }
        .btn-primary {
          background-color: var(--primary-color, #03a9f4);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 8px 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-secondary {
          background: transparent;
          border: 1px solid var(--divider-color, #ccc);
          color: var(--primary-text-color, #333);
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
        }
        .btn-danger {
          background: transparent;
          border: 1px solid #f44336;
          color: #f44336;
          border-radius: 6px;
          padding: 8px 12px;
          cursor: pointer;
        }

        .empty-state {
          padding: 32px 16px;
          text-align: center;
          color: var(--secondary-text-color, #757575);
          font-size: 0.9rem;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title-area">
            <span class="title">${escapeHtml(cardTitle)}</span>
            <span class="subtitle">
              ${escapeHtml(this._t("subtitle", this._devices.length, this._zones.length))}
            </span>
          </div>
          <div class="header-actions">
            <button class="icon-btn ${this._refreshing ? "spinning" : ""}" id="btn-refresh" title="${escapeHtml(this._t("refresh_title"))}">
              ${ICONS.refresh}
            </button>
          </div>
        </div>

        ${this._errorMessage ? `
          <div class="banner error">
            <span>⚠️</span>
            <span>${this._errorMessage}</span>
          </div>
        ` : ""}

        ${this._statusMessage ? `
          <div class="banner status">
            <span>ℹ️</span>
            <span>${this._statusMessage}</span>
          </div>
        ` : ""}

        <!-- Filter Chips Bar -->
        <div class="filter-bar">
          <div class="chip ${this._filterType === "all" ? "active" : ""}" data-type="all">
            ${escapeHtml(this._t("filter_all"))} (${this._devices.length})
          </div>
          <div class="chip ${this._filterType === "fan" ? "active" : ""}" data-type="fan">
            ${escapeHtml(this._t("filter_fan"))} (${fanCount})
          </div>
          <div class="chip ${this._filterType === "sensor" ? "active" : ""}" data-type="sensor">
            ${escapeHtml(this._t("filter_sensor"))} (${sensorCount})
          </div>
          ${controllerCount > 0 ? `
            <div class="chip ${this._filterType === "controller" ? "active" : ""}" data-type="controller">
              ${escapeHtml(this._t("filter_controller"))} (${controllerCount})
            </div>
          ` : ""}
        </div>

        <!-- Zones summary filter row -->
        <div class="zones-summary">
          <div class="zone-chip ${this._filterZone === 0 ? "active" : ""}" data-zone="0">
            ${ICONS.zone} ${escapeHtml(this._t("all_zones"))}
          </div>
          ${this._zones.map((z) => {
            const count = this._devices.filter((d) => d.zone === z.zone_id).length;
            const isAct = this._filterZone === z.zone_id;
            return `
              <div class="zone-chip ${isAct ? "active" : ""}" data-zone="${z.zone_id}">
                ${ICONS.zone} ${escapeHtml(z.name || `Zone ${z.zone_id}`)} (${count})
              </div>
            `;
          }).join("")}
        </div>

        <!-- Devices List -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            ${this._loading ? escapeHtml(this._t("empty_loading")) : escapeHtml(this._t("empty_none"))}
          </div>
        ` : `
          <div class="devices-grid">
            ${filtered.map((dev) => {
              const isFan = dev.hardware === 2;
              const isSensor = dev.hardware === 3;
              const isController = dev.hardware === 1;
              const iconBoxClass = isFan ? "fan" : (isSensor ? "sensor" : "controller");
              const devIcon = isFan ? ICONS.fan : (isSensor ? ICONS.sensor : ICONS.controller);
              const isSaving = this._assigningAddress === dev.address;

              let dynamicTargetLabel = "";
              if (dev.dynamic_zone && dev.dynamic_zone.target_zone) {
                const targetZoneObj = this._zones.find((z) => z.zone_id === dev.dynamic_zone.target_zone);
                const rawName = targetZoneObj ? (targetZoneObj.name || `Zone ${targetZoneObj.zone_id}`) : `Zone ${dev.dynamic_zone.target_zone}`;
                dynamicTargetLabel = rawName.toLowerCase().startsWith("zone") ? rawName : `Zone ${rawName}`;
              }

              return `
                <div class="device-card ${isSaving ? "saving" : ""}">
                  <div class="device-top">
                    <div class="device-icon-box ${iconBoxClass}">
                      ${devIcon}
                    </div>
                    <div class="device-header-info">
                      <div class="device-name-row">
                        <span class="device-name" title="${escapeHtml(dev.name)}">${escapeHtml(dev.name)}</span>
                        <span class="addr-badge">#${dev.address}</span>
                        <span class="status-dot ${dev.online ? "online" : "offline"}" title="${dev.online ? "Online" : "Offline"}"></span>
                      </div>
                      <div class="device-model">${escapeHtml(dev.type_name || `Typ ${dev.type}`)} · ${escapeHtml(dev.hardware_name || "")}</div>
                    </div>
                  </div>

                  <div class="metrics-row">
                    ${dev.signal !== null ? `
                      <span class="metric-badge" title="${escapeHtml(this._t("signal_level"))}">
                        ${ICONS.signal} ${dev.signal} dBm
                      </span>
                    ` : ""}
                    ${dev.temperature !== null ? `
                      <span class="metric-badge" title="${escapeHtml(this._t("temperature"))}">
                        🌡️ ${dev.temperature.toFixed(1)} °C
                      </span>
                    ` : ""}
                    ${dev.humidity !== null ? `
                      <span class="metric-badge" title="${escapeHtml(this._t("humidity"))}">
                        💧 ${dev.humidity.toFixed(0)} %
                      </span>
                    ` : ""}
                    ${dev.battery !== null ? `
                      <span class="metric-badge" title="${escapeHtml(this._t("battery_status"))}">
                        ${ICONS.battery} ${dev.battery.toFixed(0)} %
                      </span>
                    ` : ""}
                    ${dev.runtime ? `
                      <span class="metric-badge" title="${escapeHtml(this._t("runtime"))}">
                        ⏱️ ${Math.round(dev.runtime / 3600)} h
                      </span>
                    ` : ""}
                    ${dev.firmware ? `
                      <span class="metric-badge" title="${escapeHtml(this._t("firmware_version"))}">
                        v${dev.firmware}
                      </span>
                    ` : ""}
                  </div>

                  <!-- Zone Assignment -->
                  <div class="zone-assign-box">
                    <div class="zone-assign-label">
                      <span>${escapeHtml(this._t("assigned_zone"))}</span>
                      <span class="current-zone-name">${escapeHtml(dev.zone_name || `Zone ${dev.zone}`)}</span>
                    </div>
                    <div class="zone-btn-row">
                      ${this._zones.map((z) => {
                        const isAssigned = dev.zone === z.zone_id;
                        return `
                          <button 
                            class="zone-btn ${isAssigned ? "active" : ""}" 
                            data-addr="${dev.address}" 
                            data-zone="${z.zone_id}"
                            title="${escapeHtml(this._t("assign_title", dev.address, z.name || z.zone_id))}"
                          >
                            ${escapeHtml(z.name || `Zone ${z.zone_id}`)}
                          </button>
                        `;
                      }).join("")}
                    </div>
                    ${!isController ? `
                      <div class="dynamic-zone-row">
                        <button
                          class="dynamic-schedule-btn ${dev.dynamic_zone && dev.dynamic_zone.enabled ? (dev.dynamic_zone.active ? "active" : "configured") : ""}"
                          data-addr="${dev.address}"
                          title="${escapeHtml(this._t("dynamic_btn_title"))}"
                        >
                          ${ICONS.clock}
                          <span>
                            ${dev.dynamic_zone && dev.dynamic_zone.enabled
                              ? (dev.dynamic_zone.active
                                  ? escapeHtml(this._t("dynamic_badge_active", dynamicTargetLabel, dev.dynamic_zone.start_time, dev.dynamic_zone.end_time))
                                  : escapeHtml(this._t("dynamic_badge", dynamicTargetLabel, dev.dynamic_zone.start_time, dev.dynamic_zone.end_time)))
                              : escapeHtml(this._t("dynamic_btn_add"))}
                          </span>
                        </button>
                      </div>
                    ` : ""}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      </ha-card>

      ${this._editingDynamicAddress !== null && this._dynamicForm ? `
        <div class="modal-overlay" id="dyn-modal-overlay">
          <div class="modal-card">
            <div class="modal-header">
              <div class="modal-title">
                ${ICONS.clock}
                <span>${escapeHtml(this._t("dynamic_modal_title", this._devices.find((d) => d.address === this._editingDynamicAddress)?.name || `#${this._editingDynamicAddress}`))}</span>
              </div>
              <button class="icon-btn" id="btn-dyn-close" title="${escapeHtml(this._t("btn_cancel"))}">
                ${ICONS.close}
              </button>
            </div>

            <div class="modal-desc">
              ${escapeHtml(this._t("dynamic_modal_desc"))}
            </div>

            <div class="modal-row horizontal">
              <label class="modal-label" for="dyn-enabled">${escapeHtml(this._t("dynamic_enabled"))}</label>
              <input type="checkbox" id="dyn-enabled" ${this._dynamicForm.enabled ? "checked" : ""} />
            </div>

            <div class="modal-row">
              <label class="modal-label" for="dyn-target-zone">${escapeHtml(this._t("dynamic_target_zone_label"))}</label>
              <select id="dyn-target-zone" class="modal-select">
                ${this._zones.map((z) => `
                  <option value="${z.zone_id}" ${this._dynamicForm.target_zone === z.zone_id ? "selected" : ""}>
                    ${escapeHtml(z.name || `Zone ${z.zone_id}`)}
                  </option>
                `).join("")}
              </select>
            </div>

            <div class="modal-time-grid">
              <div class="modal-row">
                <label class="modal-label" for="dyn-start-time">${escapeHtml(this._t("dynamic_start_time_label"))}</label>
                <input type="time" id="dyn-start-time" class="modal-input" value="${escapeHtml(this._dynamicForm.start_time)}" />
              </div>
              <div class="modal-row">
                <label class="modal-label" for="dyn-end-time">${escapeHtml(this._t("dynamic_end_time_label"))}</label>
                <input type="time" id="dyn-end-time" class="modal-input" value="${escapeHtml(this._dynamicForm.end_time)}" />
              </div>
            </div>

            <div class="modal-row">
              <label class="modal-label">${escapeHtml(this._t("dynamic_weekdays_label"))}</label>
              <div class="days-chips-row">
                ${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((dayName, idx) => {
                  const isSel = this._dynamicForm.weekdays.includes(idx);
                  return `
                    <div class="day-chip ${isSel ? "active" : ""}" data-day="${idx}">
                      ${dayName}
                    </div>
                  `;
                }).join("")}
              </div>
              <div class="quick-days-row">
                <button type="button" class="quick-btn" id="btn-quick-workdays">${escapeHtml(this._t("quick_workdays"))}</button>
                <button type="button" class="quick-btn" id="btn-quick-weekend">${escapeHtml(this._t("quick_weekend"))}</button>
                <button type="button" class="quick-btn" id="btn-quick-all">${escapeHtml(this._t("quick_all"))}</button>
              </div>
            </div>

            <div class="modal-actions">
              <div>
                ${this._dynamicForm.hasExisting ? `
                  <button type="button" class="btn-danger" id="btn-dyn-delete">
                    ${escapeHtml(this._t("btn_delete_rule"))}
                  </button>
                ` : ""}
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="btn-secondary" id="btn-dyn-cancel">
                  ${escapeHtml(this._t("btn_cancel"))}
                </button>
                <button type="button" class="btn-primary" id="btn-dyn-save">
                  ${escapeHtml(this._t("btn_save"))}
                </button>
              </div>
            </div>
          </div>
        </div>
      ` : ""}
    `;

    this._bindEvents();
  }

  _bindEvents() {
    const root = this.shadowRoot;
    if (!root) return;

    // Refresh button
    const btnRefresh = root.getElementById("btn-refresh");
    if (btnRefresh) {
      btnRefresh.addEventListener("click", () => this._fetchDevices(true));
    }

    // Type filter chips
    const typeChips = root.querySelectorAll(".filter-bar .chip");
    typeChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        this._filterType = chip.getAttribute("data-type");
        this._render();
      });
    });

    // Zone filter chips
    const zoneChips = root.querySelectorAll(".zones-summary .zone-chip");
    zoneChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        this._filterZone = parseInt(chip.getAttribute("data-zone"), 10);
        this._render();
      });
    });

    // Zone assignment buttons
    const assignButtons = root.querySelectorAll(".zone-btn");
    assignButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const addr = parseInt(btn.getAttribute("data-addr"), 10);
        const targetZone = parseInt(btn.getAttribute("data-zone"), 10);
        const currentDev = this._devices.find((d) => d.address === addr);
        if (currentDev && currentDev.zone === targetZone) {
          return; // already assigned
        }
        this._setDeviceZone(addr, targetZone);
      });
    });

    // Dynamic schedule buttons
    const dynButtons = root.querySelectorAll(".dynamic-schedule-btn");
    dynButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const addr = parseInt(btn.getAttribute("data-addr"), 10);
        this._openDynamicDialog(addr);
      });
    });

    // Dynamic zone modal bindings
    if (this._editingDynamicAddress !== null && this._dynamicForm) {
      const overlay = root.getElementById("dyn-modal-overlay");
      const btnClose = root.getElementById("btn-dyn-close");
      const btnCancel = root.getElementById("btn-dyn-cancel");
      const btnSave = root.getElementById("btn-dyn-save");
      const btnDelete = root.getElementById("btn-dyn-delete");

      const closeHandler = () => this._closeDynamicDialog();
      if (btnClose) btnClose.addEventListener("click", closeHandler);
      if (btnCancel) btnCancel.addEventListener("click", closeHandler);
      if (overlay) {
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) closeHandler();
        });
      }

      const enabledCheckbox = root.getElementById("dyn-enabled");
      if (enabledCheckbox) {
        enabledCheckbox.addEventListener("change", (e) => {
          this._dynamicForm.enabled = e.target.checked;
        });
      }

      const targetZoneSelect = root.getElementById("dyn-target-zone");
      if (targetZoneSelect) {
        targetZoneSelect.addEventListener("change", (e) => {
          this._dynamicForm.target_zone = parseInt(e.target.value, 10);
        });
      }

      const startTimeInput = root.getElementById("dyn-start-time");
      if (startTimeInput) {
        startTimeInput.addEventListener("change", (e) => {
          this._dynamicForm.start_time = e.target.value;
        });
      }

      const endTimeInput = root.getElementById("dyn-end-time");
      if (endTimeInput) {
        endTimeInput.addEventListener("change", (e) => {
          this._dynamicForm.end_time = e.target.value;
        });
      }

      const dayChips = root.querySelectorAll(".day-chip");
      dayChips.forEach((chip) => {
        chip.addEventListener("click", () => {
          const day = parseInt(chip.getAttribute("data-day"), 10);
          const idx = this._dynamicForm.weekdays.indexOf(day);
          if (idx >= 0) {
            this._dynamicForm.weekdays.splice(idx, 1);
            chip.classList.remove("active");
          } else {
            this._dynamicForm.weekdays.push(day);
            chip.classList.add("active");
          }
        });
      });

      const setDays = (days) => {
        this._dynamicForm.weekdays = [...days];
        dayChips.forEach((chip) => {
          const day = parseInt(chip.getAttribute("data-day"), 10);
          chip.classList.toggle("active", days.includes(day));
        });
      };

      const btnWorkdays = root.getElementById("btn-quick-workdays");
      if (btnWorkdays) btnWorkdays.addEventListener("click", () => setDays([0, 1, 2, 3, 4]));

      const btnWeekend = root.getElementById("btn-quick-weekend");
      if (btnWeekend) btnWeekend.addEventListener("click", () => setDays([5, 6]));

      const btnAll = root.getElementById("btn-quick-all");
      if (btnAll) btnAll.addEventListener("click", () => setDays([0, 1, 2, 3, 4, 5, 6]));

      if (btnDelete) btnDelete.addEventListener("click", () => this._deleteDynamicZone());
      if (btnSave) btnSave.addEventListener("click", () => this._saveDynamicZone());
    }
  }
}

class InventerE16DevicesCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
  }

  setConfig(config) {
    this._config = config;
    this._render();
  }

  _t(key) {
    const lang = (this._hass?.locale?.language || "de").toLowerCase().startsWith("de") ? "de" : "en";
    const item = STRINGS[key];
    return item ? (item[lang] || item["de"]) : key;
  }

  _render() {
    const currentTitle = this._config && this._config.title ? this._config.title : this._t("card_title");
    const currentEntity = this._config && this._config.entity ? this._config.entity : "";

    this.innerHTML = `
      <style>
        .editor-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 8px 0;
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
        }
        .form-row {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .form-row label {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--secondary-text-color, #616161);
        }
        .form-row input {
          padding: 8px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 0.9rem;
        }
      </style>
      <div class="editor-form">
        <div class="form-row">
          <label for="input-title">${escapeHtml(this._t("editor_title"))}</label>
          <input type="text" id="input-title" value="${escapeHtml(currentTitle)}" placeholder="${escapeHtml(this._t("card_title"))}" />
        </div>
        <div class="form-row">
          <label for="input-entity">${escapeHtml(this._t("editor_entity"))}</label>
          <input type="text" id="input-entity" value="${escapeHtml(currentEntity)}" placeholder="fan.inventer_..." />
        </div>
      </div>
    `;

    const changeHandler = () => {
      const titleInput = this.querySelector("#input-title");
      const entityInput = this.querySelector("#input-entity");

      const newConfig = {
        ...(this._config || {}),
        title: titleInput ? titleInput.value : currentTitle,
        entity: entityInput ? entityInput.value : currentEntity
      };

      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true
      }));
    };

    const titleEl = this.querySelector("#input-title");
    if (titleEl) titleEl.addEventListener("change", changeHandler);

    const entityEl = this.querySelector("#input-entity");
    if (entityEl) entityEl.addEventListener("change", changeHandler);
  }
}

// Define custom elements
customElements.define("inventer-e16-devices-card", InventerE16DevicesCard);
customElements.define("inventer-e16-devices-card-editor", InventerE16DevicesCardEditor);

// Register in Home Assistant Lovelace Custom Cards List
window.customCards = window.customCards || [];
window.customCards.push({
  type: "inventer-e16-devices-card",
  name: "inVENTer e16 Geräte & Zonen",
  description: "Erkannte Lüfter, Sensoren und Regler anzeigen und Zonen zuordnen",
  preview: true,
  documentationURL: "https://github.com/Kadz93/ha-inventer-tools"
});

console.info(
  "%c inVENTer e16 %c Geräteverwaltung-Karte v0.3.18 (Dynamic Zones) geladen ",
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);

