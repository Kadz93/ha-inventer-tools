/**
 * inVENTer Easy Connect e16 - Lovelace Devices & Zone Management Card
 * 
 * Displays all detected wireless devices (fans, sensors, controller)
 * and allows assigning them to any configured zone.
 */

const ICONS = {
  fan: `<svg viewBox="0 0 24 24" class="dev-icon"><path fill="currentColor" d="M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm0-9C7.03 2 3 6.03 3 11c0 2.12.74 4.07 1.97 5.61L4.35 18H2v2h3.35l.86 1.49A9.95 9.95 0 0 0 12 22c4.97 0 9-4.03 9-9 0-4.97-4.03-9-9-9zm0 18c-3.15 0-5.9-1.84-7.21-4.52l2.36-.63a5.98 5.98 0 0 1 4.85 2.15v3zm-4.73-7.5c-.17-.47-.27-.97-.27-1.5 0-2.48 2.02-4.5 4.5-4.5.34 0 .67.04 1 .11V5.7a7.99 7.99 0 0 0-6.19 5.86l.96.94zm9.46 0l.96-.94A7.99 7.99 0 0 0 11.5 5.7v2.91c.33-.07.66-.11 1-.11 2.48 0 4.5 2.02 4.5 4.5 0 .53-.1 1.03-.27 1.5zm-2.25 4.52C13.16 16.52 11.63 17 10 17v3c2.45 0 4.67-.99 6.28-2.6l-1.8-1.38z"/></svg>`,
  sensor: `<svg viewBox="0 0 24 24" class="dev-icon"><path fill="currentColor" d="M15 13V5a3 3 0 0 0-6 0v8a5 5 0 1 0 6 0m-3-9a1 1 0 0 1 1 1v3h-2V5a1 1 0 0 1 1-1Z"/></svg>`,
  controller: `<svg viewBox="0 0 24 24" class="dev-icon"><path fill="currentColor" d="M4 6h16v12H4V6m2 2v2h2V8H6m0 3v2h2v-2H6m0 3v2h2v-2H6m4-6v2h8V8h-8m0 3v2h8v-2h-8m0 3v2h8v-2h-8Z"/></svg>`,
  signal: `<svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M12 3C6.5 3 2 6.5 2 10.8c0 2.4 1.4 4.5 3.6 5.8L4.5 21l4.9-2.5c.8.2 1.7.3 2.6.3 5.5 0 10-3.5 10-7.8S17.5 3 12 3zm1 12h-2v-2h2v2zm0-4h-2V7h2v4z"/></svg>`,
  battery: `<svg viewBox="0 0 24 24" class="badge-icon"><path fill="currentColor" d="M16 20H8V6h8m0-2h-1V3a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v1H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" class="action-icon"><path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
  zone: `<svg viewBox="0 0 24 24" class="zone-icon"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>`,
  checkmark: `<svg viewBox="0 0 24 24" class="status-icon"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>`
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
      console.error("Fehler beim Laden der Geräte:", err);
      this._errorMessage = "Fehler beim Laden der Geräte: " + (err.message || err);
    } finally {
      this._loading = false;
      this._refreshing = false;
      this._render();
    }
  }

  async _setDeviceZone(address, newZoneId) {
    const entityId = this._getTargetEntity();
    if (!entityId || !this._hass) return;

    // Sicherstellen, dass vor einer Zonenänderung mindestens 1x frisch vom Regler gelesen wurde
    if (!this._hasPulled) {
      this._loading = true;
      this._statusMessage = "Lade aktuellen Gerätestand vom Regler vor der Änderung...";
      this._render();
      await this._fetchDevices(true);
      if (!this._hasPulled) {
        this._errorMessage = "Fehler: Gerätedaten konnten nicht vom Regler abgerufen werden. Änderung abgebrochen.";
        this._loading = false;
        this._render();
        return;
      }
    }

    this._assigningAddress = address;
    this._errorMessage = "";
    this._statusMessage = `Weise Gerät #${address} Zone ${newZoneId} zu...`;

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

      this._statusMessage = `Gerät #${address} erfolgreich Zone ${newZoneId} zugewiesen!`;
      setTimeout(() => {
        if (this._statusMessage.includes("erfolgreich")) {
          this._statusMessage = "";
          this._render();
        }
      }, 3500);

      // Nach erfolgreicher Änderung sofort frisch vom Regler synchronisieren
      await this._fetchDevices(true);
    } catch (err) {
      console.error("Fehler beim Zuweisen der Zone:", err);
      this._errorMessage = "Fehler beim Zuweisen: " + (err.message || err);
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

    const cardTitle = this._config && this._config.title ? this._config.title : "inVENTer e16 – Geräte & Zonen";
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
            <span class="title">${cardTitle}</span>
            <span class="subtitle">
              ${this._devices.length} erkannte Geräte in ${this._zones.length} Zonen
            </span>
          </div>
          <div class="header-actions">
            <button class="icon-btn ${this._refreshing ? "spinning" : ""}" id="btn-refresh" title="Vom Regler aktualisieren">
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
            Alle (${this._devices.length})
          </div>
          <div class="chip ${this._filterType === "fan" ? "active" : ""}" data-type="fan">
            Lüfter (${fanCount})
          </div>
          <div class="chip ${this._filterType === "sensor" ? "active" : ""}" data-type="sensor">
            Sensoren (${sensorCount})
          </div>
          ${controllerCount > 0 ? `
            <div class="chip ${this._filterType === "controller" ? "active" : ""}" data-type="controller">
              Regler (${controllerCount})
            </div>
          ` : ""}
        </div>

        <!-- Zones summary filter row -->
        <div class="zones-summary">
          <div class="zone-chip ${this._filterZone === 0 ? "active" : ""}" data-zone="0">
            ${ICONS.zone} Alle Zonen
          </div>
          ${this._zones.map((z) => {
            const count = this._devices.filter((d) => d.zone === z.zone_id).length;
            const isAct = this._filterZone === z.zone_id;
            return `
              <div class="zone-chip ${isAct ? "active" : ""}" data-zone="${z.zone_id}">
                ${ICONS.zone} ${z.name || `Zone ${z.zone_id}`} (${count})
              </div>
            `;
          }).join("")}
        </div>

        <!-- Devices List -->
        ${filtered.length === 0 ? `
          <div class="empty-state">
            ${this._loading ? "Lade Geräte..." : "Keine Geräte für die gewählte Filterung gefunden."}
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

              return `
                <div class="device-card ${isSaving ? "saving" : ""}">
                  <div class="device-top">
                    <div class="device-icon-box ${iconBoxClass}">
                      ${devIcon}
                    </div>
                    <div class="device-header-info">
                      <div class="device-name-row">
                        <span class="device-name" title="${dev.name}">${dev.name}</span>
                        <span class="addr-badge">#${dev.address}</span>
                        <span class="status-dot ${dev.online ? "online" : "offline"}" title="${dev.online ? "Online" : "Offline"}"></span>
                      </div>
                      <div class="device-model">${dev.type_name || `Typ ${dev.type}`} · ${dev.hardware_name || ""}</div>
                    </div>
                  </div>

                  <div class="metrics-row">
                    ${dev.signal !== null ? `
                      <span class="metric-badge" title="Signalpegel">
                        ${ICONS.signal} ${dev.signal} dBm
                      </span>
                    ` : ""}
                    ${dev.temperature !== null ? `
                      <span class="metric-badge" title="Temperatur">
                        🌡️ ${dev.temperature.toFixed(1)} °C
                      </span>
                    ` : ""}
                    ${dev.humidity !== null ? `
                      <span class="metric-badge" title="Luftfeuchtigkeit">
                        💧 ${dev.humidity.toFixed(0)} %
                      </span>
                    ` : ""}
                    ${dev.battery !== null ? `
                      <span class="metric-badge" title="Batteriestatus">
                        ${ICONS.battery} ${dev.battery.toFixed(0)} %
                      </span>
                    ` : ""}
                    ${dev.runtime ? `
                      <span class="metric-badge" title="Betriebsstunden">
                        ⏱️ ${Math.round(dev.runtime / 3600)} h
                      </span>
                    ` : ""}
                    ${dev.firmware ? `
                      <span class="metric-badge" title="Firmware Version">
                        v${dev.firmware}
                      </span>
                    ` : ""}
                  </div>

                  <!-- Zone Assignment -->
                  <div class="zone-assign-box">
                    <div class="zone-assign-label">
                      <span>Zugewiesene Zone:</span>
                      <span class="current-zone-name">${dev.zone_name || `Zone ${dev.zone}`}</span>
                    </div>
                    <div class="zone-btn-row">
                      ${this._zones.map((z) => {
                        const isAssigned = dev.zone === z.zone_id;
                        return `
                          <button 
                            class="zone-btn ${isAssigned ? "active" : ""}" 
                            data-addr="${dev.address}" 
                            data-zone="${z.zone_id}"
                            title="Gerät #${dev.address} Zone '${z.name || z.zone_id}' zuweisen"
                          >
                            ${z.name || `Zone ${z.zone_id}`}
                          </button>
                        `;
                      }).join("")}
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        `}
      </ha-card>
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
  }
}

class InventerE16DevicesCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  _render() {
    const currentTitle = this._config && this._config.title ? this._config.title : "inVENTer e16 – Geräte & Zonen";
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
          <label for="input-title">Kartentitel</label>
          <input type="text" id="input-title" value="${currentTitle}" placeholder="inVENTer e16 – Geräte & Zonen" />
        </div>
        <div class="form-row">
          <label for="input-entity">Lüfter-Entität (optional, sonst Auto-Erkennung)</label>
          <input type="text" id="input-entity" value="${currentEntity}" placeholder="fan.inventer_..." />
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
  documentationURL: "https://github.com/tobiask1977/ha-inventer-e16"
});

console.info(
  "%c inVENTer e16 %c Geräteverwaltung-Karte geladen ",
  "color: white; background: #03a9f4; font-weight: 700;",
  "color: #03a9f4; background: white; font-weight: 700;"
);

