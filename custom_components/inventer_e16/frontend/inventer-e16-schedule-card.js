// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Markus Hennig
/**
 * inVENTer Easy Connect e16 - Lovelace Schedule Custom Card
 * 
 * Allows viewing, adding, editing, and deleting time program entries
 * for all e16 ventilation profiles (living_room, bedroom, custom_1..custom_9, etc.)
 * as well as assigning profiles to zones.
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

// ── i18n ─────────────────────────────────────────────────────────────────────
// Keys used throughout the card; add more languages by extending each object.
const STRINGS = {
  subtitle:        { de: "Lüftungs-Zeitpläne (Regler-weit)", en: "Ventilation schedules (controller-wide)" },
  profile_label:   { de: "Profil:", en: "Profile:" },
  std_profiles:    { de: "Standard-Profile", en: "Standard profiles" },
  cust_profiles:   { de: "Benutzerdefinierte Profile", en: "Custom profiles" },
  active_in_zone:  { de: "Aktiv in Zone:", en: "Active in zone:" },
  zone_active_tip: { de: "Dieses Profil ist aktuell in \"{zone}\" aktiv", en: "This profile is currently active in \"{zone}\"" },
  zone_assign_tip: { de: "Klicken, um \"{prof}\" für \"{zone}\" zu aktivieren", en: "Click to activate \"{prof}\" for \"{zone}\"" },
  badge_active:    { de: "✓ Aktiv", en: "✓ Active" },
  badge_assign:    { de: "+ Zuweisen", en: "+ Assign" },
  entries_info:    { de: "{name} ({n} / 32 Einträge belegt)", en: "{name} ({n} / 32 entries used)" },
  loading_short:   { de: "Lade...", en: "Loading…" },
  not_synced:      { de: "Nicht synchronisiert", en: "Not synchronised" },
  loading_sched:   { de: "Lade aktuellen Zeitplan vom Regler...", en: "Loading current schedule from controller…" },
  loading_sync:    { de: "Aktuelle Einträge werden synchronisiert.", en: "Synchronising entries." },
  not_loaded:      { de: "Zeitplan noch nicht vom Regler geladen.", en: "Schedule not yet loaded from controller." },
  not_loaded_hint: { de: "Klicke unten, um den aktuellen Zeitplan vom Regler abzurufen.", en: "Click below to fetch the current schedule from the controller." },
  no_entries:      { de: "Keine Zeitprogramm-Einträge für dieses Profil hinterlegt.", en: "No time-programme entries for this profile." },
  no_entries_hint: { de: "Klicke auf den Button unten, um einen Schaltpunkt anzulegen.", en: "Click the button below to add a time entry." },
  btn_loading:     { de: "Lade Zeitplan vom Regler...", en: "Loading schedule from controller…" },
  btn_fetch_first: { de: "Erst Zeitplan vom Regler laden", en: "Load schedule from controller first" },
  btn_add:         { de: "Neuen Eintrag hinzufügen", en: "Add new entry" },
  flap_open:       { de: "Klappe auf", en: "Flap open" },
  flap_closed:     { de: "Klappe zu", en: "Flap closed" },
  speed_n:         { de: "Stufe {n}", en: "Speed {n}" },
  edit_entry:      { de: "Eintrag #\"{n}\" bearbeiten", en: "Edit entry #{n}" },
  del_entry:       { de: "Eintrag löschen", en: "Delete entry" },
  edit_new:        { de: "Neuen Eintrag erstellen", en: "Create new entry" },
  edit_existing:   { de: "Eintrag #{n} bearbeiten", en: "Edit entry #{n}" },
  start_time:      { de: "Startzeit:", en: "Start time:" },
  weekdays_label:  { de: "Gültige Wochentage:", en: "Active weekdays:" },
  quick_workdays:  { de: "Mo–Fr (Werktage)", en: "Mon–Fri (workdays)" },
  quick_weekend:   { de: "Sa–So (Wochenende)", en: "Sat–Sun (weekend)" },
  quick_all:       { de: "Alle Tage", en: "All days" },
  mode_label:      { de: "Betriebsmodus:", en: "Operating mode:" },
  speed_label:     { de: "Lüfterstärke / Stufe:", en: "Fan speed / level:" },
  speed_paused:    { de: "(Bei Pause deaktiviert)", en: "(disabled during pause)" },
  btn_cancel:      { de: "Abbrechen", en: "Cancel" },
  btn_save:        { de: "Speichern", en: "Save" },
  confirm_del:     { de: "Eintrag #{n} wirklich dauerhaft löschen?", en: "Permanently delete entry #{n}?" },
  confirm_no:      { de: "Abbrechen", en: "Cancel" },
  confirm_yes:     { de: "Löschen", en: "Delete" },
  alert_full:      { de: "Alle 32 Plätze dieses Profils sind belegt.", en: "All 32 slots for this profile are occupied." },
  alert_no_time:   { de: "Bitte eine Uhrzeit angeben.", en: "Please enter a time." },
  alert_no_days:   { de: "Bitte mindestens einen Wochentag auswählen.", en: "Please select at least one weekday." },
  no_entity:       { de: "Keine inVENTer-Lüfter-Entität gefunden. Bitte in den Karteneinstellungen auswählen.", en: "No inVENTer fan entity found. Please configure one in card settings." },
  refresh_title:   { de: "Zeitplan vom Regler neu laden", en: "Reload schedule from controller" },
  // async ops
  saving:          { de: "Speichere Zeitplan auf dem Regler...", en: "Saving schedule to controller…" },
  saved_ok:        { de: "Eintrag #{n} erfolgreich gespeichert!", en: "Entry #{n} saved successfully!" },
  save_pre_load:   { de: "Lade aktuellen Zeitplan vom Regler vor dem Speichern...", en: "Loading current schedule before saving…" },
  save_pre_fail:   { de: "Fehler: Zeitplan konnte nicht vom Regler abgerufen werden. Speichern abgebrochen.", en: "Error: could not load schedule from controller. Save cancelled." },
  save_err:        { de: "Fehler beim Speichern: {e}", en: "Error saving: {e}" },
  del_pre_load:    { de: "Lade aktuellen Zeitplan vom Regler vor dem Löschen...", en: "Loading current schedule before deleting…" },
  del_pre_fail:    { de: "Fehler: Zeitplan konnte nicht vom Regler abgerufen werden. Löschen abgebrochen.", en: "Error: could not load schedule from controller. Delete cancelled." },
  deleting:        { de: "Lösche Eintrag #{n}...", en: "Deleting entry #{n}…" },
  deleted_ok:      { de: "Eintrag #{n} gelöscht.", en: "Entry #{n} deleted." },
  del_err:         { de: "Fehler beim Löschen: {e}", en: "Error deleting: {e}" },
  assign_pre:      { de: "Weise Profil \"{prof}\" der Zone \"{zone}\" zu...", en: "Assigning profile \"{prof}\" to zone \"{zone}\"…" },
  assign_ok:       { de: "Profil \"{prof}\" für \"{zone}\" aktiviert!", en: "Profile \"{prof}\" activated for \"{zone}\"!" },
  assign_err:      { de: "Fehler beim Zuweisen: {e}", en: "Error assigning: {e}" },
  load_pre_zone:   { de: "Lade aktuellen Gerätestand vom Regler vor der Änderung...", en: "Loading current device state before change…" },
  // card editor labels
  ed_title:        { de: "Titel der Karte:", en: "Card title:" },
  ed_entity:       { de: "inVENTer Lüfter-Entität:", en: "inVENTer fan entity:" },
  ed_entity_auto:  { de: "(Automatisch erkennen)", en: "(Auto-detect)" },
  ed_profile:      { de: "Standard-Profil beim Öffnen:", en: "Default profile on open:" },
};

/**
 * Pick the right translation for the user's HA language.
 * Falls back to German (the original language of the card).
 * @param {string} key  – key in STRINGS
 * @param {object} [vars] – substitution map, e.g. { n: 3, e: err.message }
 * @param {object} [hass] – hass object (reads hass.locale.language)
 */
function _t(key, vars, hass) {
  const lang = (hass?.locale?.language || "de").toLowerCase().slice(0, 2);
  const row = STRINGS[key];
  if (!row) return key;
  let text = row[lang] ?? row["de"] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
  }
  return text;
}

const PROFILES = [
  { id: "living_room",   de: "Wohnzimmer",   en: "Living room",   group: "standard" },
  { id: "bedroom",       de: "Schlafzimmer", en: "Bedroom",        group: "standard" },
  { id: "childrens_room",de: "Kinderzimmer", en: "Children's room",group: "standard" },
  { id: "bathroom",      de: "Badezimmer",   en: "Bathroom",       group: "standard" },
  { id: "kitchen",       de: "Küche",        en: "Kitchen",        group: "standard" },
  { id: "holiday",       de: "Urlaub",       en: "Holiday",        group: "standard" },
  { id: "custom_1", de: "Benutzerdefiniertes Profil 1", en: "Custom profile 1", group: "custom" },
  { id: "custom_2", de: "Benutzerdefiniertes Profil 2", en: "Custom profile 2", group: "custom" },
  { id: "custom_3", de: "Benutzerdefiniertes Profil 3", en: "Custom profile 3", group: "custom" },
  { id: "custom_4", de: "Benutzerdefiniertes Profil 4", en: "Custom profile 4", group: "custom" },
  { id: "custom_5", de: "Benutzerdefiniertes Profil 5", en: "Custom profile 5", group: "custom" },
  { id: "custom_6", de: "Benutzerdefiniertes Profil 6", en: "Custom profile 6", group: "custom" },
  { id: "custom_7", de: "Benutzerdefiniertes Profil 7", en: "Custom profile 7", group: "custom" },
  { id: "custom_8", de: "Benutzerdefiniertes Profil 8", en: "Custom profile 8", group: "custom" },
  { id: "custom_9", de: "Benutzerdefiniertes Profil 9", en: "Custom profile 9", group: "custom" },
];

const WEEKDAYS = [
  { id: "monday",    de: "Montag",      en: "Monday",    label: "Mo" },
  { id: "tuesday",   de: "Dienstag",    en: "Tuesday",   label: "Di" },
  { id: "wednesday", de: "Mittwoch",    en: "Wednesday", label: "Mi" },
  { id: "thursday",  de: "Donnerstag",  en: "Thursday",  label: "Do" },
  { id: "friday",    de: "Freitag",     en: "Friday",    label: "Fr" },
  { id: "saturday",  de: "Samstag",     en: "Saturday",  label: "Sa" },
  { id: "sunday",    de: "Sonntag",     en: "Sunday",    label: "So" },
];

const MODES = [
  {
    id: "heat_recovery",
    de: "Wärmerückgewinnung", en: "Heat recovery",
    shortDe: "Wärmerückgewinnung", shortEn: "Heat recovery",
    descDe: "Reversierender Lüfterbetrieb mit Wärmespeicher",
    descEn: "Alternating fan cycle with heat store",
    color: "var(--accent-color, #ff9800)",
    icon: `<svg viewBox="0 0 24 24" class="mode-icon"><path fill="currentColor" d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>`
  },
  {
    id: "ventilation",
    de: "Durchlüftung / Durchzug", en: "Ventilation / purge",
    shortDe: "Durchlüftung", shortEn: "Ventilation",
    descDe: "Gleichgerichteter Dauerlauf zum Entlüften / Durchzug",
    descEn: "Continuous unidirectional run for airing / purging",
    color: "var(--info-color, #03a9f4)",
    icon: `<svg viewBox="0 0 24 24" class="mode-icon"><path fill="currentColor" d="M12.74 5.47C12.35 5.18 12.18 4.71 12.31 4.25C12.57 3.32 13.53 2.77 14.46 3.03C15.82 3.41 16.79 4.67 16.79 6.13C16.79 7.78 15.45 9.13 13.79 9.13H2V7.13H13.79C14.35 7.13 14.79 6.68 14.79 6.13C14.79 5.64 14.46 5.21 14 5.09C13.56 4.96 13.1 5.1 12.74 5.47M17.79 10.13H2V12.13H17.79C18.35 12.13 18.79 12.58 18.79 13.13C18.79 13.62 18.46 14.05 18 14.17C17.56 14.3 17.1 14.16 16.74 13.79C16.35 13.5 16.18 13.03 16.31 12.57C16.57 11.64 17.53 11.09 18.46 11.35C19.82 11.73 20.79 12.99 20.79 14.45C20.79 16.11 19.45 17.45 17.79 17.45H2V19.45H17.79C20.55 19.45 22.79 17.21 22.79 14.45C22.79 12.03 21.07 9.94 18.71 9.53C18.4 9.47 18.09 9.5 17.79 10.13M10.74 15.47C10.35 15.18 10.18 14.71 10.31 14.25C10.57 13.32 11.53 12.77 12.46 13.03C13.82 13.41 14.79 14.67 14.79 16.13C14.79 17.78 13.45 19.13 11.79 19.13H2V17.13H11.79C12.35 17.13 12.79 16.68 12.79 16.13C12.79 15.64 12.46 15.21 12 15.09C11.56 14.96 11.1 15.1 10.74 15.47Z"/></svg>`
  },
  {
    id: "pause",
    de: "Pause (Klappe zu)", en: "Pause (flap closed)",
    shortDe: "Pause zu", shortEn: "Pause closed",
    descDe: "Lüfter aus, Verschlussklappe geschlossen",
    descEn: "Fan off, closure flap shut",
    color: "var(--warning-color, #e91e63)",
    icon: `<svg viewBox="0 0 24 24" class="mode-icon"><path fill="currentColor" d="M14 19h4V5h-4M6 19h4V5H6v14Z"/></svg>`
  },
  {
    id: "pause_open",
    de: "Pause (Klappe offen / Durchzug)", en: "Pause (flap open / passive)",
    shortDe: "Pause offen", shortEn: "Pause open",
    descDe: "Lüfter aus, Verschlussklappe für passiven Luftstrom geöffnet",
    descEn: "Fan off, closure flap open for passive airflow",
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

  /** Translate a string key, optionally substituting variables. */
  _t(key, vars) {
    return _t(key, vars, this._hass);
  }

  /** Localised profile name for a profile object from PROFILES. */
  _profName(p) {
    const lang = (this._hass?.locale?.language || "de").toLowerCase().slice(0, 2);
    return p[lang] ?? p["de"] ?? p.id;
  }

  /** Localised mode label (full or short). */
  _modeName(m, short = false) {
    const lang = (this._hass?.locale?.language || "de").toLowerCase().slice(0, 2);
    if (short) return m[`short${lang.charAt(0).toUpperCase() + lang.slice(1)}`] ?? m["shortDe"] ?? m.id;
    return m[lang] ?? m["de"] ?? m.id;
  }

  /** Localised mode description. */
  _modeDesc(m) {
    const lang = (this._hass?.locale?.language || "de").toLowerCase().slice(0, 2);
    return m[`desc${lang.charAt(0).toUpperCase() + lang.slice(1)}`] ?? m["descDe"] ?? "";
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

    // Preferred 1: scope by entity state attributes (integration === "inventer_e16" and zone_id)
    const stateMatches = Object.keys(this._hass.states).filter((id) => {
      if (!id.startsWith("select.")) return false;
      const attrs = this._hass.states[id]?.attributes;
      return attrs && attrs.integration === "inventer_e16" && attrs.zone_id !== undefined;
    });

    if (stateMatches.length > 0) {
      return stateMatches
        .map((id) => {
          const state = this._hass.states[id];
          let name = state.attributes.friendly_name || id;
          name = name.replace(/ Profil$/i, "").replace(/ Profile$/i, "");
          return {
            entity_id: id,
            name: name,
            zone_id: state.attributes.zone_id,
            currentProfile: state.state
          };
        })
        .sort((a, b) => a.zone_id - b.zone_id);
    }

    // Preferred 2: use entity registry (HA 2023.4+)
    const registry = this._hass.entities;
    if (registry) {
      const regMatches = Object.values(registry).filter(
        (e) =>
          e.platform === "inventer_e16" &&
          e.translation_key === "profile" &&
          e.entity_id.startsWith("select.")
      );
      if (regMatches.length > 0) {
        return regMatches.map((e) => {
          const state = this._hass.states[e.entity_id];
          let name = state?.attributes?.friendly_name || e.name || e.entity_id;
          name = name.replace(/ Profil$/i, "").replace(/ Profile$/i, "");
          return {
            entity_id: e.entity_id,
            name,
            currentProfile: state?.state ?? null
          };
        });
      }
    }

    // Fallback: filter select entities whose options include
    // the profile keys.
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
    const selectedProfName = this._profName(selectedProfObj);
    const profName = this._profName(selectedProfObj);
    try {
      this._statusMessage = this._t("assign_pre", { prof: profName, zone: zoneName });
      this._render();

      await this._hass.callService("select", "select_option", {
        entity_id: selectEntityId,
        option: this._selectedProfile
      });

      this._statusMessage = this._t("assign_ok", { prof: profName, zone: zoneName });
      setTimeout(() => {
        if (this._statusMessage === this._t("assign_ok", { prof: profName, zone: zoneName })) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);
    } catch (err) {
      console.error("Error assigning profile:", err);
      this._errorMessage = this._t("assign_err", { e: err.message || err });
      this._render();
    }
  }

  async _fetchSchedule() {
    const entityId = this._getTargetEntity();
    if (!entityId || !this._hass) {
      this._errorMessage = this._t("no_entity");
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
      console.error("Error fetching schedule:", err);
      this._errorMessage = this._t("save_err", { e: err.message || err });
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

    // Ensure at least one fetch before writing
    if (!this._pulledProfiles.has(this._selectedProfile)) {
      this._loading = true;
      this._statusMessage = this._t("save_pre_load");
      this._render();
      await this._fetchSchedule();
      if (!this._pulledProfiles.has(this._selectedProfile)) {
        this._errorMessage = this._t("save_pre_fail");
        this._loading = false;
        this._render();
        return;
      }
    }

    this._loading = true;
    this._errorMessage = "";
    this._statusMessage = this._t("saving");
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
      this._statusMessage = this._t("saved_ok", { n: entryData.entry });
      setTimeout(() => {
        if (this._statusMessage === this._t("saved_ok", { n: entryData.entry })) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      await this._fetchSchedule();
    } catch (err) {
      console.error("Error saving entry:", err);
      this._errorMessage = this._t("save_err", { e: err.message || err });
      this._loading = false;
      this._render();
    }
  }

  async _deleteEntry(entryIndex) {
    const entityId = this._getTargetEntity();
    if (!entityId) return;

    // Ensure at least one fetch before deleting
    if (!this._pulledProfiles.has(this._selectedProfile)) {
      this._loading = true;
      this._statusMessage = this._t("del_pre_load");
      this._render();
      await this._fetchSchedule();
      if (!this._pulledProfiles.has(this._selectedProfile)) {
        this._errorMessage = this._t("del_pre_fail");
        this._loading = false;
        this._render();
        return;
      }
    }

    this._loading = true;
    this._errorMessage = "";
    this._statusMessage = this._t("deleting", { n: entryIndex });
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
      this._statusMessage = this._t("deleted_ok", { n: entryIndex });
      setTimeout(() => {
        if (this._statusMessage === this._t("deleted_ok", { n: entryIndex })) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      await this._fetchSchedule();
    } catch (err) {
      console.error("Error deleting entry:", err);
      this._errorMessage = this._t("del_err", { e: err.message || err });
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
      alert(this._t("alert_full"));
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

  /** Read the current time-input value back into _editingEntry before any re-render. */
  _syncEditTime() {
    if (!this._editingEntry) return;
    const root = this.shadowRoot;
    if (!root) return;
    const timeInput = root.getElementById("edit-time");
    if (timeInput && timeInput.value) {
      this._editingEntry.time = timeInput.value;
    }
  }

  _render() {
    const root = this.shadowRoot;
    if (!root) return;

    const selectedProfObj = PROFILES.find((p) => p.id === this._selectedProfile) || PROFILES[0];
    const selectedProfName = this._profName(selectedProfObj);
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
            <span class="title">${escapeHtml(cardTitle)}</span>
            <span class="subtitle">${this._t("subtitle")}</span>
          </div>
        </div>

        <div class="profile-bar">
          <span class="profile-label">${this._t("profile_label")}</span>
          <select id="profile-select" class="profile-select">
            <optgroup label="${this._t("std_profiles")}">
              ${PROFILES.filter((p) => p.group === "standard")
                .map(
                  (p) => `
                <option value="${p.id}" ${p.id === this._selectedProfile ? "selected" : ""}>
                  ${this._profName(p)}
                </option>
              `
                )
                .join("")}
            </optgroup>
            <optgroup label="${this._t("cust_profiles")}">
              ${PROFILES.filter((p) => p.group === "custom")
                .map(
                  (p) => `
                <option value="${p.id}" ${p.id === this._selectedProfile ? "selected" : ""}>
                  ${this._profName(p)}
                </option>
              `
                )
                .join("")}
            </optgroup>
          </select>
          <button id="refresh-btn" class="btn-icon" title="${this._t("refresh_title")}">
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px;">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </button>
        </div>

        ${
          zones.length > 0
            ? `
          <div class="zones-bar">
            <span class="zones-label">${this._t("active_in_zone")}</span>
            <div class="zones-list">
              ${zones
                .map((z) => {
                  const isActive = z.currentProfile === this._selectedProfile;
                  return `
                  <button type="button" class="zone-pill ${isActive ? "active" : ""}"
                          data-entity="${escapeHtml(z.entity_id)}" data-name="${escapeHtml(z.name)}"
                          title="${
                            isActive
                              ? escapeHtml(this._t("zone_active_tip", { zone: z.name }))
                              : escapeHtml(this._t("zone_assign_tip", { prof: selectedProfName, zone: z.name }))
                          }">
                    <span class="zone-dot ${isActive ? "active" : ""}"></span>
                    <span class="zone-name">${escapeHtml(z.name)}</span>
                    <span class="zone-status-badge ${isActive ? "active" : "inactive"}">
                      ${isActive ? this._t("badge_active") : this._t("badge_assign")}
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
            <span class="confirm-text">${this._t("confirm_del", { n: this._deleteConfirm })}</span>
            <div>
              <button id="confirm-del-no" class="btn-cancel">${this._t("confirm_no")}</button>
              <button id="confirm-del-yes" class="btn-danger">${this._t("confirm_yes")}</button>
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
            <span><strong>${selectedProfName}</strong> (${this._entries.length} / 32 ${this._t("not_synced").startsWith("Not") ? "entries used" : "Einträge belegt"})</span>
            ${this._loading ? `<span>${this._t("loading_short")}</span>` : !hasPulled ? `<span>${this._t("not_synced")}</span>` : ""}
          </div>

          ${
            !hasPulled && this._loading
              ? `
              <div class="empty-state">
                <svg viewBox="0 0 24 24" class="empty-state-icon">
                  <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                </svg>
                <div>${this._t("loading_sched")}</div>
                <div style="font-size: 0.8rem; margin-top: 4px;">${this._t("loading_sync")}</div>
              </div>
            `
              : !hasPulled && !this._loading
              ? `
              <div class="empty-state">
                <svg viewBox="0 0 24 24" class="empty-state-icon">
                  <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                </svg>
                <div>${this._t("not_loaded")}</div>
                <div style="font-size: 0.8rem; margin-top: 4px;">${this._t("not_loaded_hint")}</div>
              </div>
            `
              : sortedEntries.length === 0 && !this._loading
              ? `
              <div class="empty-state">
                <svg viewBox="0 0 24 24" class="empty-state-icon">
                  <path fill="currentColor" d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
                </svg>
                <div>${this._t("no_entries")}</div>
                <div style="font-size: 0.8rem; margin-top: 4px;">${this._t("no_entries_hint")}</div>
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
                        ${this._modeName(modeObj, true)}
                      </span>
                      <span class="badge badge-speed">
                        ${isPause ? (entry.mode === "pause_open" ? this._t("flap_open") : this._t("flap_closed")) : this._t("speed_n", { n: entry.speed })}
                      </span>
                      <span class="badge-slot">#${entry.entry}</span>
                      <button class="btn-icon edit-entry-btn" data-slot="${entry.entry}" title="${this._t("edit_entry", { n: entry.entry })}">
                        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px;"><path fill="currentColor" d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75 1.84-1.83M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25Z"/></svg>
                      </button>
                      <button class="btn-icon del-entry-btn" data-slot="${entry.entry}" title="${this._t("del_entry")}">
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
            ${this._loading ? this._t("btn_loading") : !hasPulled ? this._t("btn_fetch_first") : this._t("btn_add")}
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
          <span>${entry.isNew ? this._t("edit_new") : this._t("edit_existing", { n: entry.entry })}</span>
          <span class="badge-slot">${this._selectedProfile}</span>
        </div>

        <div class="form-row">
          <label class="form-label" for="edit-time">${this._t("start_time")}</label>
          <input type="time" id="edit-time" class="time-input" value="${entry.time}" required />
        </div>

        <div class="form-row">
          <label class="form-label">${this._t("weekdays_label")}</label>
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
            <button type="button" class="quick-btn" id="btn-quick-workdays">${this._t("quick_workdays")}</button>
            <button type="button" class="quick-btn" id="btn-quick-weekend">${this._t("quick_weekend")}</button>
            <button type="button" class="quick-btn" id="btn-quick-all">${this._t("quick_all")}</button>
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">${this._t("mode_label")}</label>
          <div class="mode-options">
            ${MODES.map(
              (m) => `
              <button type="button" class="mode-option-btn ${entry.mode === m.id ? "selected" : ""}" data-mode="${m.id}">
                <span style="color: ${m.color}">${m.icon}</span>
                <div>
                  <div style="font-weight: 500">${this._modeName(m)}</div>
                  <div style="font-size: 0.72rem; color: var(--secondary-text-color)">${this._modeDesc(m)}</div>
                </div>
              </button>
            `
            ).join("")}
          </div>
        </div>

        <div class="form-row">
          <label class="form-label">${this._t("speed_label")} ${isPause ? this._t("speed_paused") : ""}</label>
          <div class="speed-selector">
            ${[1, 2, 3, 4]
              .map(
                (lvl) => `
              <button type="button" class="speed-btn ${!isPause && entry.speed === lvl ? "selected" : ""}"
                      data-speed="${lvl}" ${isPause ? "disabled" : ""}>
                ${this._t("speed_n", { n: lvl })}
              </button>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="form-actions">
          <button type="button" id="btn-edit-cancel" class="btn-cancel">${this._t("btn_cancel")}</button>
          <button type="button" id="btn-edit-save" class="btn-save">${this._t("btn_save")}</button>
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
          this._syncEditTime();
          this._render();
        });
      });

      // Quick day buttons
      const qWork = root.getElementById("btn-quick-workdays");
      if (qWork) {
        qWork.addEventListener("click", () => {
          this._syncEditTime();
          this._editingEntry.days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
          this._render();
        });
      }
      const qEnd = root.getElementById("btn-quick-weekend");
      if (qEnd) {
        qEnd.addEventListener("click", () => {
          this._syncEditTime();
          this._editingEntry.days = ["saturday", "sunday"];
          this._render();
        });
      }
      const qAll = root.getElementById("btn-quick-all");
      if (qAll) {
        qAll.addEventListener("click", () => {
          this._syncEditTime();
          this._editingEntry.days = WEEKDAYS.map((w) => w.id);
          this._render();
        });
      }

      // Mode option buttons
      root.querySelectorAll(".mode-option-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this._syncEditTime();
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
          this._syncEditTime();
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
            alert(this._t("alert_no_time"));
            return;
          }

          if (!this._editingEntry.days || this._editingEntry.days.length === 0) {
            alert(this._t("alert_no_days"));
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
          <label style="display:block; font-weight:500; margin-bottom:4px;">Card title:</label>
          <input type="text" id="input-title" value="${escapeHtml(currentTitle)}"
                 style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;" />
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">inVENTer fan entity:</label>
          <select id="input-entity" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;">
            <option value="">(Auto-detect)</option>
            ${fanEntities
              .map(
                (id) => `
              <option value="${escapeHtml(id)}" ${currentEntity === id ? "selected" : ""}>
                ${escapeHtml(this._hass.states?.[id]?.attributes?.friendly_name || id)} (${escapeHtml(id)})
              </option>
            `
              )
              .join("")}
          </select>
        </div>
        <div>
          <label style="display:block; font-weight:500; margin-bottom:4px;">Default profile on open:</label>
          <select id="input-profile" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;">
            ${PROFILES.map(
              (p) => `
              <option value="${p.id}" ${currentProfile === p.id ? "selected" : ""}>
                ${p.en || p.de || p.id}
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
  documentationURL: "https://github.com/Kadz93/ha-inventer-tools"
});

console.info(
  "%c inVENTer e16 %c Zeitplan-Karte geladen ",
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);
