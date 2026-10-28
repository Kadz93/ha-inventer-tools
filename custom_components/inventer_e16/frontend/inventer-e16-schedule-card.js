/**
 * inVENTer Easy Connect e16 - Lovelace Schedule Custom Card
 * 
 * Allows viewing, adding, editing, and deleting time program entries
 * for all e16 ventilation profiles (living_room, bedroom, custom_1..custom_9, etc.)
 * as well as assigning profiles to zones.
 */

const PROFILES = [
  { id: "living_room", name: "Wohnzimmer", group: "standard" },
  { id: "bedroom", name: "Schlafzimmer", group: "standard" },
  { id: "childrens_room", name: "Kinderzimmer", group: "standard" },
  { id: "bathroom", name: "Badezimmer", group: "standard" },
  { id: "kitchen", name: "Küche", group: "standard" },
  { id: "holiday", name: "Urlaub", group: "standard" },
  { id: "custom_1", name: "Benutzerdefiniertes Profil 1", group: "custom" },
  { id: "custom_2", name: "Benutzerdefiniertes Profil 2", group: "custom" },
  { id: "custom_3", name: "Benutzerdefiniertes Profil 3", group: "custom" },
  { id: "custom_4", name: "Benutzerdefiniertes Profil 4", group: "custom" },
  { id: "custom_5", name: "Benutzerdefiniertes Profil 5", group: "custom" },
  { id: "custom_6", name: "Benutzerdefiniertes Profil 6", group: "custom" },
  { id: "custom_7", name: "Benutzerdefiniertes Profil 7", group: "custom" },
  { id: "custom_8", name: "Benutzerdefiniertes Profil 8", group: "custom" },
  { id: "custom_9", name: "Benutzerdefiniertes Profil 9", group: "custom" },
];

const WEEKDAYS = [
  { id: "monday", label: "Mo", name: "Montag" },
  { id: "tuesday", label: "Di", name: "Dienstag" },
  { id: "wednesday", label: "Mi", name: "Mittwoch" },
  { id: "thursday", label: "Do", name: "Donnerstag" },
  { id: "friday", label: "Fr", name: "Freitag" },
  { id: "saturday", label: "Sa", name: "Samstag" },
  { id: "sunday", label: "So", name: "Sonntag" },
];

const MODES = [
  {
    id: "heat_recovery",
    name: "Wärmerückgewinnung",
    shortName: "Wärmerückgewinnung",
    desc: "Reversierender Lüfterbetrieb mit Wärmespeicher",
    color: "var(--accent-color, #ff9800)",
    icon: `<svg viewBox="0 0 24 24" class="mode-icon"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`
  },
  {
    id: "ventilation",
    name: "Durchlüftung / Durchzug",
    shortName: "Durchlüftung",
    desc: "Gleichgerichteter Dauerlauf zum Entlüften / Durchzug",
    color: "var(--info-color, #03a9f4)",
    icon: `<svg viewBox="0 0 24 24" class="mode-icon"><path fill="currentColor" d="M12.74 5.47C12.35 5.18 12.18 4.71 12.31 4.25C12.57 3.32 13.53 2.77 14.46 3.03C15.82 3.41 16.79 4.67 16.79 6.13C16.79 7.78 15.45 9.13 13.79 9.13H2V7.13H13.79C14.35 7.13 14.79 6.68 14.79 6.13C14.79 5.64 14.46 5.21 14 5.09C13.56 4.96 13.1 5.1 12.74 5.47M17.79 10.13H2V12.13H17.79C18.35 12.13 18.79 12.58 18.79 13.13C18.79 13.62 18.46 14.05 18 14.17C17.56 14.3 17.1 14.16 16.74 13.79C16.35 13.5 16.18 13.03 16.31 12.57C16.57 11.64 17.53 11.09 18.46 11.35C19.82 11.73 20.79 12.99 20.79 14.45C20.79 16.11 19.45 17.45 17.79 17.45H2V19.45H17.79C20.55 19.45 22.79 17.21 22.79 14.45C22.79 12.03 21.07 9.94 18.71 9.53C18.4 9.47 18.09 9.5 17.79 10.13M10.74 15.47C10.35 15.18 10.18 14.71 10.31 14.25C10.57 13.32 11.53 12.77 12.46 13.03C13.82 13.41 14.79 14.67 14.79 16.13C14.79 17.78 13.45 19.13 11.79 19.13H2V17.13H11.79C12.35 17.13 12.79 16.68 12.79 16.13C12.79 15.64 12.46 15.21 12 15.09C11.56 14.96 11.1 15.1 10.74 15.47Z"/></svg>`
  },
  {
    id: "pause",
    name: "Pause (Klappe zu)",
    shortName: "Pause zu",
    desc: "Lüfter aus, Verschlussklappe geschlossen",
    color: "var(--warning-color, #e91e63)",
    icon: `<svg viewBox="0 0 24 24" class="mode-icon"><path fill="currentColor" d="M14 19h4V5h-4M6 19h4V5H6v14Z"/></svg>`
  },
  {
    id: "pause_open",
    name: "Pause (Klappe offen / Durchzug)",
    shortName: "Pause offen",
    desc: "Lüfter aus, Verschlussklappe für passiven Luftstrom geöffnet",
    color: "var(--purple-color, #9c27b0)",
    icon: `<svg viewBox="0 0 24 24" class="mode-icon"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-8 16H5v-6h6v6m0-8H5V5h6v6m8 8h-6v-6h6v6m0-8h-6V5h6v6Z"/></svg>`
  }
];

class InventerE16ScheduleCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {
      title: "inVENTer e16 – Zeitpläne",
      default_profile: "living_room",
      entity: ""
    };
    this._selectedProfile = "living_room";
    this._entries = [];
    this._loading = false;
    this._errorMessage = "";
    this._statusMessage = "";
    this._editingEntry = null; // null or { entry, time, days, mode, speed, isNew }
    this._deleteConfirm = null; // entry number to confirm deletion
    this._initialFetchDone = false;
    this._pulledProfiles = new Set();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._initialFetchDone && hass) {
      const entityId = this._getTargetEntity();
      if (entityId) {
        this._initialFetchDone = true;
        this._fetchSchedule();
      }
    } else if (this._initialFetchDone && hass) {
      // Re-render when zone profile states change
      this._render();
    }
  }

  setConfig(config) {
    this._config = {
      title: "inVENTer e16 – Zeitpläne",
      default_profile: "living_room",
      entity: "",
      ...(config || {})
    };
    if (this._config.default_profile && !this._initialFetchDone) {
      this._selectedProfile = this._config.default_profile;
    }
    this._render();
  }

  getCardSize() {
    return 6;
  }

  static async getConfigElement() {
    return document.createElement("inventer-e16-schedule-card-editor");
  }

  static getStubConfig() {
    return {
      title: "inVENTer e16 – Zeitpläne",
      entity: "",
      default_profile: "living_room"
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
    if (this._config && this._config.entity) return this._config.entity;

    const fanEntities = Object.keys(this._hass.states || {}).filter((id) => {
      if (!id.startsWith("fan.")) return false;
      const state = this._hass.states[id];
      if (!state || !state.attributes) return false;
      const modes = state.attributes.preset_modes || [];
      return modes.includes("heat_recovery") && modes.includes("ventilation");
    });

    if (fanEntities.length > 0) {
      return fanEntities[0];
    }

    // Fallback: search for any fan entity with 'inventer' in the name
    const namedEntities = Object.keys(this._hass.states || {}).filter(
      (id) => id.startsWith("fan.") && id.toLowerCase().includes("inventer")
    );
    return namedEntities[0] || "";
  }

  _getZoneProfileEntities() {
    if (!this._hass || !this._hass.states) return [];
    return Object.keys(this._hass.states)
      .filter((id) => {
        if (!id.startsWith("select.")) return false;
        const state = this._hass.states[id];
        if (!state || !state.attributes) return false;
        const options = state.attributes.options || [];
        return options.includes("living_room") && options.includes("bedroom");
      })
      .map((id) => {
        const state = this._hass.states[id];
        let name = state.attributes.friendly_name || id;
        name = name.replace(/ Profil$/i, "").replace(/ Profile$/i, "");
        return {
          entity_id: id,
          name: name,
          currentProfile: state.state
        };
      });
  }

  async _assignProfileToZone(selectEntityId, zoneName) {
    if (!this._hass) return;
    const selectedProfObj = PROFILES.find((p) => p.id === this._selectedProfile) || PROFILES[0];
    try {
      this._statusMessage = `Weise Profil "${selectedProfObj.name}" der Zone "${zoneName}" zu...`;
      this._render();

      await this._hass.callService("select", "select_option", {
        entity_id: selectEntityId,
        option: this._selectedProfile
      });

      this._statusMessage = `Profil "${selectedProfObj.name}" für "${zoneName}" aktiviert!`;
      setTimeout(() => {
        if (this._statusMessage.includes("aktiviert")) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);
    } catch (err) {
      console.error("Fehler beim Zuweisen des Profils:", err);
      this._errorMessage = `Fehler beim Zuweisen: ${err.message || err}`;
      this._render();
    }
  }

  async _fetchSchedule() {
    const entityId = this._getTargetEntity();
    if (!entityId || !this._hass) {
      this._errorMessage = "Keine inVENTer-Lüfter-Entität gefunden. Bitte in den Karteneinstellungen auswählen.";
      this._pulledProfiles.delete(this._selectedProfile);
      this._render();
      return;
    }

    this._loading = true;
    this._errorMessage = "";
    this._render();

    try {
      let res = null;
      if (this._hass.connection && this._hass.connection.sendMessagePromise) {
        res = await this._hass.connection.sendMessagePromise({
          type: "call_service",
          domain: "inventer_e16",
          service: "get_time_program",
          target: { entity_id: entityId },
          service_data: { profile: this._selectedProfile },
          return_response: true
        });
      }

      const responseData = res && res.response ? res.response : res;
      if (responseData && Array.isArray(responseData.entries)) {
        this._entries = responseData.entries;
      } else if (responseData && responseData[entityId] && Array.isArray(responseData[entityId].entries)) {
        this._entries = responseData[entityId].entries;
      } else {
        this._entries = [];
      }
      this._pulledProfiles.add(this._selectedProfile);
    } catch (err) {
      console.error("Fehler beim Abrufen des Zeitprogramms:", err);
      this._errorMessage = "Fehler beim Laden: " + (err.message || err);
      this._pulledProfiles.delete(this._selectedProfile);
      this._entries = [];
    } finally {
      this._loading = false;
      this._render();
    }
  }

  async _saveEntry(entryData) {
    const entityId = this._getTargetEntity();
    if (!entityId) return;

    // Sicherstellen, dass vor dem Schreiben erst mindestens 1x vom Regler gepulled wurde
    if (!this._pulledProfiles.has(this._selectedProfile)) {
      this._loading = true;
      this._statusMessage = "Lade aktuellen Zeitplan vom Regler vor dem Speichern...";
      this._render();
      await this._fetchSchedule();
      if (!this._pulledProfiles.has(this._selectedProfile)) {
        this._errorMessage = "Fehler: Zeitplan konnte nicht vom Regler abgerufen werden. Speichern abgebrochen.";
        this._loading = false;
        this._render();
        return;
      }
    }

    this._loading = true;
    this._errorMessage = "";
    this._statusMessage = "Speichere Zeitplan auf dem Regler...";
    this._render();

    try {
      await this._hass.callService(
        "inventer_e16",
        "set_time_program_entry",
        {
          profile: this._selectedProfile,
          entry: parseInt(entryData.entry, 10),
          time: entryData.time,
          days: entryData.days,
          mode: entryData.mode,
          speed: parseInt(entryData.speed, 10) || 1
        },
        { entity_id: entityId }
      );

      this._editingEntry = null;
      this._statusMessage = `Eintrag #${entryData.entry} erfolgreich gespeichert!`;
      setTimeout(() => {
        if (this._statusMessage.includes("gespeichert")) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      await this._fetchSchedule();
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      this._errorMessage = "Fehler beim Speichern: " + (err.message || err);
      this._loading = false;
      this._render();
    }
  }

  async _deleteEntry(entryIndex) {
    const entityId = this._getTargetEntity();
    if (!entityId) return;

    // Sicherstellen, dass vor dem Löschen erst mindestens 1x vom Regler gepulled wurde
    if (!this._pulledProfiles.has(this._selectedProfile)) {
      this._loading = true;
      this._statusMessage = "Lade aktuellen Zeitplan vom Regler vor dem Löschen...";
      this._render();
      await this._fetchSchedule();
      if (!this._pulledProfiles.has(this._selectedProfile)) {
        this._errorMessage = "Fehler: Zeitplan konnte nicht vom Regler abgerufen werden. Löschen abgebrochen.";
        this._loading = false;
        this._render();
        return;
      }
    }

    this._loading = true;
    this._errorMessage = "";
    this._statusMessage = `Lösche Eintrag #${entryIndex}...`;
    this._render();

    try {
      await this._hass.callService(
        "inventer_e16",
        "delete_time_program_entry",
        {
          profile: this._selectedProfile,
          entry: parseInt(entryIndex, 10)
        },
        { entity_id: entityId }
      );

      this._deleteConfirm = null;
      this._statusMessage = `Eintrag #${entryIndex} gelöscht.`;
      setTimeout(() => {
        if (this._statusMessage.includes("gelöscht")) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      await this._fetchSchedule();
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      this._errorMessage = "Fehler beim Löschen: " + (err.message || err);
      this._loading = false;
      this._render();
    }
  }

  _getFreeSlots() {
    const occupied = new Set(this._entries.map((e) => e.entry));
    const free = [];
    for (let i = 0; i < 32; i++) {
      if (!occupied.has(i)) free.push(i);
    }
    return free;
  }

  _startNewEntry() {
    if (!this._pulledProfiles.has(this._selectedProfile)) {
      this._fetchSchedule();
      return;
    }

    const freeSlots = this._getFreeSlots();
    if (freeSlots.length === 0) {
      alert("Alle 32 Plätze dieses Profils sind belegt.");
      return;
    }

    this._editingEntry = {
      isNew: true,
      entry: freeSlots[0],
      time: "07:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      mode: "heat_recovery",
      speed: 2
    };
    this._render();
  }

  _startEditEntry(entry) {
    if (!this._pulledProfiles.has(this._selectedProfile)) {
      this._fetchSchedule();
      return;
    }

    this._editingEntry = {
      isNew: false,
      entry: entry.entry,
      time: entry.time,
      days: [...entry.days],
      mode: entry.mode,
      speed: entry.speed || 1
    };
    this._render();
  }

  _cancelEdit() {
    this._editingEntry = null;
    this._render();
  }

  _render() {
    const root = this.shadowRoot;
    if (!root) return;

    const selectedProfObj = PROFILES.find((p) => p.id === this._selectedProfile) || PROFILES[0];
    const hasPulled = this._pulledProfiles.has(this._selectedProfile);
    const sortedEntries = [...this._entries].sort((a, b) => {
      if (a.time === b.time) return a.entry - b.entry;
      return a.time.localeCompare(b.time);
    });

    const cardTitle = this._config && this._config.title ? this._config.title : "inVENTer e16 – Zeitpläne";
    const zones = this._getZoneProfileEntities();

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
          margin-bottom: 14px;
        }
        .title-area {
          display: flex;
          flex-direction: column;
        }
        .title {
          font-size: 1.25rem;
          font-weight: 500;
          line-height: 1.2;
          color: var(--primary-text-color, #212121);
        }
        .subtitle {
          font-size: 0.82rem;
          color: var(--secondary-text-color, #757575);
          margin-top: 2px;
        }
        .profile-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          background: var(--secondary-background-color, #f5f5f5);
          padding: 10px 12px;
          border-radius: 8px;
          flex-wrap: wrap;
        }
        .profile-label {
          font-weight: 500;
          font-size: 0.9rem;
          color: var(--primary-text-color);
        }
        .profile-select {
          flex: 1;
          min-width: 180px;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
        }
        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          color: var(--secondary-text-color, #757575);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, color 0.2s;
        }
        .btn-icon:hover {
          background: rgba(0,0,0,0.06);
          color: var(--primary-color, #03a9f4);
        }

        /* Zones status & assignment bar */
        .zones-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 6px 4px;
          flex-wrap: wrap;
        }
        .zones-label {
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--secondary-text-color, #757575);
        }
        .zones-list {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          align-items: center;
        }
        .zone-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 16px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
          font-size: 0.82rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .zone-pill:hover {
          border-color: var(--primary-color, #03a9f4);
          background: rgba(3, 169, 244, 0.05);
        }
        .zone-pill.active {
          background: var(--primary-color, #03a9f4);
          border-color: var(--primary-color, #03a9f4);
          color: #fff;
          font-weight: 600;
        }
        .zone-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #bdbdbd;
        }
        .zone-dot.active {
          background: #fff;
        }
        .zone-status-badge {
          font-size: 0.72rem;
        }
        .zone-status-badge.active {
          opacity: 0.95;
        }
        .zone-status-badge.inactive {
          color: var(--secondary-text-color, #757575);
        }

        .status-banner {
          background: rgba(76, 175, 80, 0.15);
          color: #2e7d32;
          border: 1px solid rgba(76, 175, 80, 0.3);
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 12px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .error-banner {
          background: rgba(244, 67, 54, 0.15);
          color: #c62828;
          border: 1px solid rgba(244, 67, 54, 0.3);
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 12px;
          font-size: 0.9rem;
        }
        .entries-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 0.85rem;
          color: var(--secondary-text-color, #757575);
        }
        .entry-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        .entry-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--card-background-color, #fff);
          border: 1px solid var(--divider-color, #e0e0e0);
          border-radius: 8px;
          padding: 10px 14px;
          transition: transform 0.1s, box-shadow 0.1s;
          flex-wrap: wrap;
          gap: 10px;
        }
        .entry-card:hover {
          border-color: var(--primary-color, #03a9f4);
          box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .entry-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .entry-time {
          font-size: 1.35rem;
          font-weight: 600;
          font-feature-settings: "tnum";
          color: var(--primary-text-color, #111);
          min-width: 65px;
        }
        .day-chips {
          display: flex;
          gap: 3px;
        }
        .day-chip {
          font-size: 0.72rem;
          padding: 2px 5px;
          border-radius: 4px;
          background: var(--secondary-background-color, #f0f0f0);
          color: var(--disabled-text-color, #9e9e9e);
          font-weight: 500;
        }
        .day-chip.active {
          background: var(--primary-color, #03a9f4);
          color: #fff;
          font-weight: 600;
        }
        .entry-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        .badge-mode {
          background: rgba(0,0,0,0.05);
        }
        .badge-speed {
          background: var(--secondary-background-color, #eceff1);
          color: var(--primary-text-color, #37474f);
          font-weight: 600;
        }
        .badge-slot {
          font-size: 0.75rem;
          color: var(--secondary-text-color, #888);
          background: var(--secondary-background-color, #f5f5f5);
          padding: 2px 6px;
          border-radius: 4px;
        }
        .mode-icon {
          width: 16px;
          height: 16px;
        }
        .btn-add {
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px dashed var(--primary-color, #03a9f4);
          background: rgba(3, 169, 244, 0.05);
          color: var(--primary-color, #03a9f4);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.2s;
        }
        .btn-add:hover {
          background: rgba(3, 169, 244, 0.12);
        }
        .empty-state {
          text-align: center;
          padding: 24px 16px;
          color: var(--secondary-text-color, #757575);
          border: 1px dashed var(--divider-color, #ddd);
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .empty-state-icon {
          width: 42px;
          height: 42px;
          margin-bottom: 8px;
          opacity: 0.5;
        }

        /* Editor Modal / Form */
        .editor-container {
          background: var(--secondary-background-color, #fbfbfb);
          border: 1px solid var(--primary-color, #03a9f4);
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          font-weight: 600;
          font-size: 1.05rem;
          color: var(--primary-text-color);
        }
        .form-row {
          margin-bottom: 14px;
        }
        .form-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--secondary-text-color, #616161);
          margin-bottom: 6px;
        }
        .time-slot-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .time-input {
          font-size: 1.25rem;
          font-weight: 600;
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
        }
        .slot-select {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 0.95rem;
        }
        .day-toggle-group {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .day-toggle {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .day-toggle.selected {
          background: var(--primary-color, #03a9f4);
          border-color: var(--primary-color, #03a9f4);
          color: #fff;
          font-weight: 600;
        }
        .quick-days {
          display: flex;
          gap: 6px;
        }
        .quick-btn {
          font-size: 0.75rem;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--card-background-color, #eee);
          border: 1px solid var(--divider-color, #ddd);
          color: var(--secondary-text-color);
          cursor: pointer;
        }
        .quick-btn:hover {
          background: var(--divider-color, #e0e0e0);
        }
        .mode-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 8px;
        }
        .mode-option-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px;
          background: var(--card-background-color, #fff);
          cursor: pointer;
          font-size: 0.85rem;
          text-align: left;
          color: var(--primary-text-color);
          transition: all 0.15s;
        }
        .mode-option-btn.selected {
          border-color: var(--primary-color, #03a9f4);
          background: rgba(3, 169, 244, 0.08);
          font-weight: 600;
        }
        .speed-selector {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .speed-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 6px;
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          text-align: center;
        }
        .speed-btn.selected {
          background: var(--primary-color, #03a9f4);
          border-color: var(--primary-color, #03a9f4);
          color: #fff;
        }
        .speed-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 18px;
        }
        .btn-cancel {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid var(--divider-color, #ccc);
          background: var(--card-background-color, #fff);
          color: var(--secondary-text-color, #666);
          cursor: pointer;
          font-weight: 500;
        }
        .btn-save {
          padding: 8px 18px;
          border-radius: 6px;
          border: none;
          background: var(--primary-color, #03a9f4);
          color: #fff;
          cursor: pointer;
          font-weight: 600;
        }
        .confirm-dialog {
          background: rgba(244, 67, 54, 0.08);
          border: 1px solid rgba(244, 67, 54, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .confirm-text {
          font-size: 0.9rem;
          color: #c62828;
          font-weight: 500;
        }
        .btn-danger {
          background: #d32f2f;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
        }
      </style>

      <ha-card>
        <div class="header">
          <div class="title-area">
            <span class="title">${cardTitle}</span>
            <span class="subtitle">Lüftungs-Zeitpläne (Regler-weit)</span>
          </div>
        </div>

        <div class="profile-bar">
          <span class="profile-label">Profil:</span>
          <select id="profile-select" class="profile-select">
            <optgroup label="Standard-Profile">
              ${PROFILES.filter((p) => p.group === "standard")
                .map(
                  (p) => `
                <option value="${p.id}" ${p.id === this._selectedProfile ? "selected" : ""}>
                  ${p.name}
                </option>
              `
                )
                .join("")}
            </optgroup>
            <optgroup label="Benutzerdefinierte Profile">
              ${PROFILES.filter((p) => p.group === "custom")
                .map(
                  (p) => `
                <option value="${p.id}" ${p.id === this._selectedProfile ? "selected" : ""}>
                  ${p.name}
                </option>
              `
                )
                .join("")}
            </optgroup>
          </select>
          <button id="refresh-btn" class="btn-icon" title="Zeitplan vom Regler neu laden">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>

        ${
          zones.length > 0
            ? `
          <div class="zones-bar">
            <span class="zones-label">Aktiv in Zone:</span>
            <div class="zones-list">
              ${zones
                .map((z) => {
                  const isActive = z.currentProfile === this._selectedProfile;
                  return `
                  <button type="button" class="zone-pill ${isActive ? "active" : ""}"
                          data-entity="${z.entity_id}" data-name="${z.name}"
                          title="${
                            isActive
                              ? `Dieses Profil ist aktuell in "${z.name}" aktiv`
                              : `Klicken, um "${selectedProfObj.name}" für "${z.name}" zu aktivieren`
                          }">
                    <span class="zone-dot ${isActive ? "active" : ""}"></span>
                    <span class="zone-name">${z.name}</span>
                    <span class="zone-status-badge ${isActive ? "active" : "inactive"}">
                      ${isActive ? "✓ Aktiv" : "+ Zuweisen"}
                    </span>
                  </button>
                `;
                })
                .join("")}
            </div>
          </div>
        `
            : ""
        }

        ${
          this._statusMessage
            ? `<div class="status-banner">
                <svg viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path fill="currentColor" d="M21 7L9 19l-5.5-5.5l1.41-1.41L9 16.17L19.59 5.59L21 7Z"/></svg>
                <span>${this._statusMessage}</span>
               </div>`
            : ""
        }
        ${this._errorMessage ? `<div class="error-banner">${this._errorMessage}</div>` : ""}

        ${
          this._deleteConfirm !== null
            ? `
          <div class="confirm-dialog">
            <span class="confirm-text">Eintrag #${this._deleteConfirm} wirklich dauerhaft löschen?</span>
            <div>
              <button id="confirm-del-no" class="btn-cancel">Abbrechen</button>
              <button id="confirm-del-yes" class="btn-danger">Löschen</button>
            </div>
          </div>
        `
            : ""
        }

        ${
          this._editingEntry
            ? this._renderEditor(this._editingEntry)
            : `
          <div class="entries-info">
            <span><strong>${selectedProfObj.name}</strong> (${this._entries.length} / 32 Einträge belegt)</span>
            ${this._loading ? "<span>Lade...</span>" : !hasPulled ? "<span>Nicht synchronisiert</span>" : ""}
          </div>

          ${
            !hasPulled && this._loading
              ? `
              <div class="empty-state">
                <svg viewBox="0 0 24 24" class="empty-state-icon">
                  <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                </svg>
                <div>Lade aktuellen Zeitplan vom Regler...</div>
                <div style="font-size: 0.8rem; margin-top: 4px;">Aktuelle Einträge werden synchronisiert.</div>
              </div>
            `
              : !hasPulled && !this._loading
              ? `
              <div class="empty-state">
                <svg viewBox="0 0 24 24" class="empty-state-icon">
                  <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                </svg>
                <div>Zeitplan noch nicht vom Regler geladen.</div>
                <div style="font-size: 0.8rem; margin-top: 4px;">Klicke unten, um den aktuellen Zeitplan vom Regler abzurufen.</div>
              </div>
            `
              : sortedEntries.length === 0 && !this._loading
              ? `
              <div class="empty-state">
                <svg viewBox="0 0 24 24" class="empty-state-icon">
                  <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                </svg>
                <div>Keine Zeitprogramm-Einträge für dieses Profil hinterlegt.</div>
                <div style="font-size: 0.8rem; margin-top: 4px;">Klicke auf den Button unten, um einen Schaltpunkt anzulegen.</div>
              </div>
            `
              : ""
          }

          <div class="entry-list">
            ${sortedEntries
              .map((entry) => {
                const modeObj = MODES.find((m) => m.id === entry.mode) || MODES[0];
                const isPause = entry.mode === "pause" || entry.mode === "pause_open";
                return `
                  <div class="entry-card">
                    <div class="entry-left">
                      <div class="entry-time">${entry.time}</div>
                      <div class="day-chips">
                        ${WEEKDAYS.map(
                          (w) => `
                          <span class="day-chip ${entry.days && entry.days.includes(w.id) ? "active" : ""}">
                            ${w.label}
                          </span>
                        `
                        ).join("")}
                      </div>
                    </div>
                    <div class="entry-right">
                      <span class="badge badge-mode" style="color: ${modeObj.color}">
                        ${modeObj.icon}
                        ${modeObj.shortName}
                      </span>
                      <span class="badge badge-speed">
                        ${isPause ? "Klappe " + (entry.mode === "pause_open" ? "auf" : "zu") : "Stufe " + entry.speed}
                      </span>
                      <span class="badge-slot">#${entry.entry}</span>
                      <button class="btn-icon edit-entry-btn" data-slot="${entry.entry}" title="Eintrag bearbeiten">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path fill="currentColor" d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25Z"/></svg>
                      </button>
                      <button class="btn-icon del-entry-btn" data-slot="${entry.entry}" title="Eintrag löschen">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; color: #d32f2f;"><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12Z"/></svg>
                      </button>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>

          <button id="add-entry-btn" class="btn-add" ${!hasPulled || this._loading ? "disabled style='opacity: 0.6; cursor: not-allowed;'" : ""}>
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            ${this._loading ? "Lade Zeitplan vom Regler..." : !hasPulled ? "Erst Zeitplan vom Regler laden" : "Neuen Eintrag hinzufügen"}
          </button>
        `
        }
      </ha-card>
    `;

    this._attachEvents();
  }

  _renderEditor(entry) {
    const isPause = entry.mode === "pause" || entry.mode === "pause_open";

    return `
      <div class="editor-container">
        <div class="editor-header">
          <span>${entry.isNew ? "Neuen Eintrag erstellen" : `Eintrag #${entry.entry} bearbeiten`}</span>
          <span class="badge-slot">${this._selectedProfile}</span>
        </div>

        <div class="form-row">
          <label class="form-label" for="edit-time">Startzeit:</label>
          <input type="time" id="edit-time" class="time-input" value="${entry.time}" required />
        </div>

        <div class="form-row">
          <label class="form-label">Gültige Wochentage:</label>
          <div class="day-toggle-group">
            ${WEEKDAYS.map(
              (w) => `
              <button type="button" class="day-toggle ${entry.days && entry.days.includes(w.id) ? "selected" : ""}" data-day="${w.id}">
                ${w.label}
              </button>
            `
            ).join("")}
          </div>
          <div class="quick-days">
            <button type="button" class="quick-btn" id="btn-quick-workdays">Mo–Fr (Werktage)</button>
            <button type="button" class="quick-btn" id="btn-quick-weekend">Sa–So (Wochenende)</button>
            <button type="button" class="quick-btn" id="btn-quick-all">Alle Tage</button>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">Betriebsmodus:</label>
          <div class="mode-options">
            ${MODES.map(
              (m) => `
              <button type="button" class="mode-option-btn ${entry.mode === m.id ? "selected" : ""}" data-mode="${m.id}">
                <span style="color: ${m.color}">${m.icon}</span>
                <div>
                  <div style="font-weight: 500">${m.name}</div>
                  <div style="font-size: 0.72rem; color: var(--secondary-text-color)">${m.desc}</div>
                </div>
              </button>
            `
            ).join("")}
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">Lüfterstärke / Stufe: ${isPause ? "(Bei Pause deaktiviert)" : ""}</label>
          <div class="speed-selector">
            ${[1, 2, 3, 4]
              .map(
                (lvl) => `
              <button type="button" class="speed-btn ${!isPause && entry.speed === lvl ? "selected" : ""}"
                      data-speed="${lvl}" ${isPause ? "disabled" : ""}>
                Stufe ${lvl}
              </button>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="form-actions">
          <button type="button" id="btn-edit-cancel" class="btn-cancel">Abbrechen</button>
          <button type="button" id="btn-edit-save" class="btn-save">Speichern</button>
        </div>
      </div>
    `;
  }

  _attachEvents() {
    const root = this.shadowRoot;
    if (!root) return;

    // Profile selector
    const profSel = root.getElementById("profile-select");
    if (profSel) {
      profSel.addEventListener("change", (e) => {
        this._selectedProfile = e.target.value;
        this._editingEntry = null;
        this._deleteConfirm = null;
        this._entries = [];
        this._fetchSchedule();
      });
    }

    // Refresh button
    const refreshBtn = root.getElementById("refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this._fetchSchedule();
      });
    }

    // Zone assignment buttons
    root.querySelectorAll(".zone-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        const entityId = btn.getAttribute("data-entity");
        const zoneName = btn.getAttribute("data-name");
        this._assignProfileToZone(entityId, zoneName);
      });
    });

    // Add entry button
    const addBtn = root.getElementById("add-entry-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        if (!this._pulledProfiles.has(this._selectedProfile)) {
          this._fetchSchedule();
          return;
        }
        this._startNewEntry();
      });
    }

    // Edit entry buttons
    root.querySelectorAll(".edit-entry-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slot = parseInt(btn.getAttribute("data-slot"), 10);
        const entry = this._entries.find((e) => e.entry === slot);
        if (entry) this._startEditEntry(entry);
      });
    });

    // Delete entry buttons
    root.querySelectorAll(".del-entry-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const slot = parseInt(btn.getAttribute("data-slot"), 10);
        this._deleteConfirm = slot;
        this._render();
      });
    });

    // Confirm deletion buttons
    const delYes = root.getElementById("confirm-del-yes");
    if (delYes) {
      delYes.addEventListener("click", () => {
        if (this._deleteConfirm !== null) {
          this._deleteEntry(this._deleteConfirm);
        }
      });
    }
    const delNo = root.getElementById("confirm-del-no");
    if (delNo) {
      delNo.addEventListener("click", () => {
        this._deleteConfirm = null;
        this._render();
      });
    }

    // Editor events
    if (this._editingEntry) {
      const cancelBtn = root.getElementById("btn-edit-cancel");
      if (cancelBtn) {
        cancelBtn.addEventListener("click", () => this._cancelEdit());
      }

      // Day toggles
      root.querySelectorAll(".day-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
          const day = btn.getAttribute("data-day");
          if (!this._editingEntry.days) this._editingEntry.days = [];
          const idx = this._editingEntry.days.indexOf(day);
          if (idx >= 0) {
            if (this._editingEntry.days.length > 1) {
              this._editingEntry.days.splice(idx, 1);
            }
          } else {
            this._editingEntry.days.push(day);
          }
          this._render();
        });
      });

      // Quick day buttons
      const qWork = root.getElementById("btn-quick-workdays");
      if (qWork) {
        qWork.addEventListener("click", () => {
          this._editingEntry.days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
          this._render();
        });
      }
      const qEnd = root.getElementById("btn-quick-weekend");
      if (qEnd) {
        qEnd.addEventListener("click", () => {
          this._editingEntry.days = ["saturday", "sunday"];
          this._render();
        });
      }
      const qAll = root.getElementById("btn-quick-all");
      if (qAll) {
        qAll.addEventListener("click", () => {
          this._editingEntry.days = WEEKDAYS.map((w) => w.id);
          this._render();
        });
      }

      // Mode option buttons
      root.querySelectorAll(".mode-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const mode = btn.getAttribute("data-mode");
          this._editingEntry.mode = mode;
          if (mode === "pause" || mode === "pause_open") {
            this._editingEntry.speed = 0;
          } else if (this._editingEntry.speed === 0) {
            this._editingEntry.speed = 1;
          }
          this._render();
        });
      });

      // Speed buttons
      root.querySelectorAll(".speed-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this._editingEntry.speed = parseInt(btn.getAttribute("data-speed"), 10);
          this._render();
        });
      });

      // Save button
      const saveBtn = root.getElementById("btn-edit-save");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          const timeInput = root.getElementById("edit-time");
          const timeVal = timeInput ? timeInput.value : this._editingEntry.time;

          if (!timeVal) {
            alert("Bitte eine Uhrzeit angeben.");
            return;
          }

          if (!this._editingEntry.days || this._editingEntry.days.length === 0) {
            alert("Bitte mindestens einen Wochentag auswählen.");
            return;
          }

          this._saveEntry({
            entry: this._editingEntry.entry,
            time: timeVal,
            days: this._editingEntry.days,
            mode: this._editingEntry.mode,
            speed: this._editingEntry.speed
          });
        });
      }
    }
  }
}

/**
 * Visual Editor for Lovelace Card UI
 */
class InventerE16ScheduleCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {
      title: "inVENTer e16 – Zeitpläne",
      entity: "",
      default_profile: "living_room"
    };
  }

  setConfig(config) {
    this._config = {
      title: "inVENTer e16 – Zeitpläne",
      entity: "",
      default_profile: "living_room",
      ...(config || {})
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  render() {
    if (!this._hass) return;
    if (!this._config) {
      this._config = {
        title: "inVENTer e16 – Zeitpläne",
        entity: "",
        default_profile: "living_room"
      };
    }
    const fanEntities = Object.keys(this._hass.states || {}).filter((id) => id.startsWith("fan."));

    const currentTitle = this._config?.title || "inVENTer e16 – Zeitpläne";
    const currentEntity = this._config?.entity || "";
    const currentProfile = this._config?.default_profile || "living_room";

    this.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 12px; padding: 12px 0;">
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Titel der Karte:</label>
          <input type="text" id="input-title" value="${currentTitle}"
                 style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;" />
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">inVENTer Lüfter-Entität:</label>
          <select id="input-entity" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;">
            <option value="">(Automatisch erkennen)</option>
            ${fanEntities
              .map(
                (id) => `
              <option value="${id}" ${currentEntity === id ? "selected" : ""}>
                ${this._hass.states?.[id]?.attributes?.friendly_name || id} (${id})
              </option>
            `
              )
              .join("")}
          </select>
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Standard-Profil beim Öffnen:</label>
          <select id="input-profile" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;">
            ${PROFILES.map(
              (p) => `
              <option value="${p.id}" ${currentProfile === p.id ? "selected" : ""}>
                ${p.name}
              </option>
            `
              )
              .join("")}
          </select>
        </div>
      </div>
    `;

    const changeHandler = () => {
      const titleInput = this.querySelector("#input-title");
      const entityInput = this.querySelector("#input-entity");
      const profileInput = this.querySelector("#input-profile");

      const newConfig = {
        ...(this._config || {}),
        title: titleInput ? titleInput.value : currentTitle,
        entity: entityInput ? entityInput.value : currentEntity,
        default_profile: profileInput ? profileInput.value : currentProfile
      };

      const event = new CustomEvent("config-changed", {
        detail: { config: newConfig },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    };

    const titleEl = this.querySelector("#input-title");
    if (titleEl) titleEl.addEventListener("change", changeHandler);

    const entityEl = this.querySelector("#input-entity");
    if (entityEl) entityEl.addEventListener("change", changeHandler);

    const profileEl = this.querySelector("#input-profile");
    if (profileEl) profileEl.addEventListener("change", changeHandler);
  }
}

// Define Custom Elements
customElements.define("inventer-e16-schedule-card", InventerE16ScheduleCard);
customElements.define("inventer-e16-schedule-card-editor", InventerE16ScheduleCardEditor);

// Register in Home Assistant Lovelace Custom Cards List
window.customCards = window.customCards || [];
window.customCards.push({
  type: "inventer-e16-schedule-card",
  name: "inVENTer e16 Zeitplan",
  description: "Zeitprofile bearbeiten (Wohnzimmer, Schlafzimmer, Benutzerdefinierte Profile 1-9 etc.)",
  preview: true,
  documentationURL: "https://github.com/tobiask1977/ha-inventer-e16"
});

console.info(
  "%c inVENTer e16 %c Zeitplan-Karte geladen ",
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);
