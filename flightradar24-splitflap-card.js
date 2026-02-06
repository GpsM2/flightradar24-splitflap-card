class FlightRadar24SplitFlapCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.flights = [];
    this.displayedFlights = [];
  }

  static getStubConfig() {
    return {
      entity: "sensor.flightradar24_airport_arrivals",
      title: "ANKÜNFTE",
      max_flights: 8,
      mode: "auto",
      status_colors: []
    }
  }

  // WICHTIG FÜR SECTIONS VIEW:
  // Definiert die Standardgröße im Raster
  static getLayoutOptions() {
    return {
      grid_columns: 4, // Standardbreite (volle Breite in Standardspalte)
      grid_min_rows: 3, // Mindesthöhe
      grid_rows: 'auto' // Automatische Höhe basierend auf Inhalt
    };
  }

  static getConfigElement() {
    return document.createElement("flightradar24-splitflap-editor");
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Bitte entity angeben');
    }

    this.config = {
      entity: config.entity,
      title: config.title || 'ANKÜNFTE',
      max_flights: config.max_flights || 8,
      flip_duration: config.flip_duration || 800,
      flip_delay: config.flip_delay || 50,
      mode: config.mode || 'auto',
      status_colors: config.status_colors || [
        { status: "GELANDET", color: "#4caf50" },
        { status: "VERSPÄTET", color: "#ff9800" },
        { status: "CANCELLED", color: "#f44336" },
        { status: "FRÜHER", color: "#2196f3" }
      ],
      ...config
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    const entity = hass.states[this.config.entity];
    
    if (!entity) return;

    const newFlights = entity.attributes.flights || [];
    
    if (JSON.stringify(newFlights) !== JSON.stringify(this.flights)) {
      this.updateFlights(newFlights);
    }
  }

  detectMode(flight) {
    if (this.config.mode !== 'auto') return this.config.mode;
    return (flight.status_text !== undefined || flight.time_scheduled_arrival !== undefined) ? 'airport' : 'area';
  }

  updateFlights(newFlights) {
    this.flights = newFlights.slice(0, this.config.max_flights);
    
    if (this.flights.length === 0) {
        this.displayedFlights = [];
        this.renderFlightBoard();
        return;
    }

    if (this.displayedFlights.length === 0) {
      this.displayedFlights = this.flights.map(f => this.formatFlight(f));
      this.renderFlightBoard();
      return;
    }

    this.flights.forEach((flight, index) => {
      const newData = this.formatFlight(flight);
      const oldData = this.displayedFlights[index];
      
      if (!oldData || JSON.stringify(newData) !== JSON.stringify(oldData)) {
        if (index < this.displayedFlights.length) {
            this.animateRow(index, oldData || {}, newData);
        } else {
            this.displayedFlights.push(newData);
            this.renderFlightBoard();
        }
      }
    });
    
    if (this.flights.length < this.displayedFlights.length) {
        this.displayedFlights = this.flights.map(f => this.formatFlight(f));
        this.renderFlightBoard();
    }
  }

  formatFlight(flight) {
    const mode = this.detectMode(flight);
    const url = flight.flight_number 
        ? `https://www.flightradar24.com/data/flights/${flight.flight_number}`
        : (flight.callsign ? `https://www.flightradar24.com/${flight.callsign}` : null);

    const formatted = mode === 'airport' ? this.formatAirportFlight(flight) : this.formatAreaFlight(flight);
    formatted.url = url;
    return formatted;
  }

  formatAirportFlight(flight) {
    const timestamp = flight.time_estimated_arrival || flight.time_scheduled_arrival;
    const timeObj = timestamp ? new Date(timestamp * 1000) : null;
    
    return {
      time: timeObj ? this.formatTime(timeObj) : '--:--',
      flight: (flight.flight_number || flight.callsign || 'N/A').padEnd(8, ' ').substring(0, 8),
      from: (flight.airport_origin_city || flight.airport_city || 'Unbekannt').padEnd(15, ' ').substring(0, 15),
      status: (flight.status_text || 'ERWARTET').toUpperCase().padEnd(12, ' ').substring(0, 12),
      aircraft: (flight.aircraft_model || '').padEnd(12, ' ').substring(0, 12)
    };
  }

  formatAreaFlight(flight) {
    const scheduled = flight.time_scheduled_arrival ? new Date(flight.time_scheduled_arrival * 1000) : null;
    const estimated = flight.time_estimated_arrival ? new Date(flight.time_estimated_arrival * 1000) : null;
    const timeDisplay = estimated || scheduled;

    return {
      time: timeDisplay ? this.formatTime(timeDisplay) : '--:--',
      flight: (flight.flight_number || flight.callsign || 'N/A').padEnd(8, ' ').substring(0, 8),
      from: (flight.airport_origin_code_iata || flight.airport_origin_city || 'N/A').padEnd(15, ' ').substring(0, 15),
      status: this.getAreaStatus(flight, scheduled, estimated),
      aircraft: (flight.aircraft_model || '').padEnd(12, ' ').substring(0, 12)
    };
  }

  formatTime(date) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  }

  getAreaStatus(flight, scheduled, estimated) {
    if (flight.on_ground === 1) return 'GELANDET    ';
    if (estimated && scheduled) {
      const diffMinutes = Math.round((estimated - scheduled) / 60000);
      if (diffMinutes > 15) return `+${diffMinutes} MIN     `; 
      if (diffMinutes < -10) return 'FRÜHER      ';
    }
    if (flight.altitude < 1000 && flight.speed > 0) return 'LANDING     ';
    return 'UNTERWEGS   ';
  }

  getStatusColor(statusText) {
    if (!statusText) return '#e8e8e8';
    const cleanStatus = statusText.trim().toUpperCase();
    
    for (const item of this.config.status_colors) {
        if (cleanStatus.includes(item.status.toUpperCase())) return item.color;
        if (cleanStatus.startsWith('+') && (item.status === 'DELAYED' || item.status === 'VERSPÄTET')) return item.color;
    }
    return '#e8e8e8'; 
  }

  animateRow(rowIndex, oldData, newData) {
    const row = this.shadowRoot.querySelector(`[data-row="${rowIndex}"]`);
    if (!row) return;

    row.dataset.url = newData.url || '';
    row.style.cursor = newData.url ? 'pointer' : 'default';

    const fields = ['time', 'flight', 'from', 'status', 'aircraft'];
    const statusColor = this.getStatusColor(newData.status);

    fields.forEach((field, fieldIndex) => {
      const oldText = oldData[field] || '';
      const newText = newData[field] || '';
      
      if (field === 'status') {
         const cell = row.querySelector(`[data-field="status"]`);
         if(cell) {
             const chars = cell.querySelectorAll('.flap-char');
             chars.forEach(char => char.style.color = statusColor);
         }
      }

      if (oldText !== newText) {
        this.animateField(row, field, oldText, newText, fieldIndex * 100, field === 'status' ? statusColor : null);
      }
    });

    this.displayedFlights[rowIndex] = newData;
  }

  animateField(row, fieldName, oldText, newText, baseDelay, color = null) {
    const cell = row.querySelector(`[data-field="${fieldName}"]`);
    if (!cell) return;

    const chars = cell.querySelectorAll('.flap-char');
    const maxLen = Math.max(oldText.length, newText.length);

    for (let i = 0; i < maxLen; i++) {
      const oldChar = oldText[i] || ' ';
      const newChar = newText[i] || ' ';
      
      if (oldChar !== newChar && chars[i]) {
        this.flipCharacter(chars[i], oldChar, newChar, baseDelay + i * this.config.flip_delay, color);
      } else if (color && chars[i]) {
        chars[i].style.color = color;
      }
    }
  }

  flipCharacter(element, oldChar, newChar, delay, color = null) {
    setTimeout(() => {
      element.classList.add('flipping');
      setTimeout(() => {
        element.textContent = newChar;
        if (color) element.style.color = color;
        element.classList.remove('flipping');
      }, this.config.flip_duration / 2);
    }, delay);
  }

  renderFlightBoard() {
    const board = this.shadowRoot.querySelector('.flight-board');
    if (!board) return;

    board.innerHTML = '';
    
    if (this.displayedFlights.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'no-flights';
        emptyState.textContent = 'KEINE FLÜGE GEFUNDEN';
        board.appendChild(emptyState);
        return;
    }
    
    this.displayedFlights.forEach((flight, index) => {
      const row = this.createFlightRow(flight, index);
      board.appendChild(row);
    });
  }

  createFlightRow(flight, index) {
    const row = document.createElement('div');
    row.className = 'flight-row';
    row.setAttribute('data-row', index);
    
    if (flight.url) {
        row.dataset.url = flight.url;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => window.open(flight.url, '_blank'));
    }

    const fields = [
      { name: 'time', value: flight.time, class: 'col-time' },
      { name: 'flight', value: flight.flight, class: 'col-flight' },
      { name: 'from', value: flight.from, class: 'col-from' },
      { name: 'status', value: flight.status, class: 'col-status' },
      { name: 'aircraft', value: flight.aircraft, class: 'col-aircraft' }
    ];

    const statusColor = this.getStatusColor(flight.status);

    fields.forEach(field => {
      const cell = document.createElement('div');
      cell.className = `flight-cell ${field.class}`;
      cell.setAttribute('data-field', field.name);
      
      for (const char of field.value) {
        const charSpan = document.createElement('span');
        charSpan.className = 'flap-char';
        charSpan.textContent = char;
        if (field.name === 'status') charSpan.style.color = statusColor;
        cell.appendChild(charSpan);
      }
      row.appendChild(cell);
    });

    return row;
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          container-type: inline-size;
          height: 100%; /* Wichtig für Sections View */
        }
        .card-header {
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
          color: #ffa500;
          padding: 16px;
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 4px;
          border-radius: 8px 8px 0 0;
          font-family: 'Courier New', monospace;
        }
        .header-row, .flight-row {
          display: grid;
          /* Default: Full view */
          grid-template-columns: 60px 90px 2fr 130px 1.5fr; 
          gap: 8px;
          padding: 4px 12px;
          align-items: center;
        }
        
        /* Container Queries für dynamisches Layout (Sections View) */
        /* Sehr schmal (1 Spalte im Dashboard) -> Flugzeug und Von ausblenden */
        @container (max-width: 450px) {
          .header-row, .flight-row {
             grid-template-columns: 55px 80px 1fr;
          }
          .col-from, .col-aircraft, 
          .header-cell:nth-child(3), .header-cell:nth-child(5) {
             display: none;
          }
          .card-header { font-size: 18px; }
        }
        
        /* Mittel (normale Karte) -> Flugzeug ausblenden */
        @container (min-width: 451px) and (max-width: 650px) {
           .header-row, .flight-row {
             grid-template-columns: 60px 90px 1fr 120px;
          }
           .col-aircraft, .header-cell:nth-child(5) {
             display: none;
           }
        }

        .header-row {
          background: #2a2a2a;
          color: #ffa500;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 2px;
          font-family: 'Courier New', monospace;
          border-bottom: 2px solid #444;
          padding-top: 12px;
          padding-bottom: 12px;
        }
        .flight-board {
          background: #1a1a1a;
          border-radius: 0 0 8px 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          min-height: 50px;
        }
        .no-flights {
            padding: 20px;
            text-align: center;
            color: #666;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            letter-spacing: 2px;
        }
        .flight-row {
          border-bottom: 1px solid #333;
          min-height: 48px;
          background: linear-gradient(180deg, #222 0%, #1a1a1a 100%);
          white-space: nowrap;
        }
        .flight-cell {
          display: flex;
          gap: 2px;
          overflow: hidden;
        }
        .flap-char {
          display: inline-block;
          min-width: 12px;
          width: 12px;
          height: 32px;
          line-height: 32px;
          text-align: center;
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 48%, #0a0a0a 52%, #1a1a1a 100%);
          color: #e8e8e8;
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: bold;
          border-radius: 2px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3);
          position: relative;
        }
        .flap-char:before {
          content: '';
          position: absolute;
          top: 50%; left: 0; right: 0; height: 1px;
          background: rgba(0,0,0,0.6);
          box-shadow: 0 1px 0 rgba(255,255,255,0.05);
        }
        .flap-char.flipping { animation: flip 800ms ease-in-out; }
        @keyframes flip {
          0% { transform: scaleY(1); }
          50% { transform: scaleY(0.1); filter: brightness(1.5); }
          100% { transform: scaleY(1); }
        }
      </style>

      <div class="card-header">${this.config.title}</div>
      <div class="header-row">
        <div class="header-cell">ZEIT</div>
        <div class="header-cell">FLUG</div>
        <div class="header-cell">VON/NACH</div>
        <div class="header-cell">STATUS</div>
        <div class="header-cell">FLUGZEUG</div>
      </div>
      <div class="flight-board"></div>
    `;

    if (this.displayedFlights.length > 0) {
      this.renderFlightBoard();
    } else {
      this.renderFlightBoard();
    }
  }

  getCardSize() {
    return 3;
  }
}

// -------------------------------------------------------------------
// EDITOR CLASS: Nutzt jetzt ha-entity-picker für Dropdown
// -------------------------------------------------------------------
class FlightRadar24SplitFlapEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    // Wenn der Picker schon gerendert ist, müssen wir hass updaten, damit er funktioniert
    const picker = this.querySelector('ha-entity-picker');
    if (picker) {
      picker.hass = hass;
    }
  }

  configChanged(newConfig) {
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  render() {
    // Einfacher Schutz gegen Re-Rendering
    if (this.querySelector('.card-config')) return;

    this.innerHTML = `
      <style>
        .card-config { display: flex; flex-direction: column; gap: 12px; padding: 12px; }
        .row { display: flex; align-items: center; gap: 12px; }
        label { width: 100px; font-weight: bold; }
        input, select, textarea { padding: 8px; flex: 1; border: 1px solid #ccc; border-radius: 4px;}
        ha-entity-picker { flex: 1; }
      </style>
      <div class="card-config">
        <div class="row">
            <ha-entity-picker
                id="entity-picker"
                label="Entity"
                allow-custom-entity
            ></ha-entity-picker>
        </div>
        <div class="row">
          <label>Titel</label>
          <input type="text" id="title" value="${this._config.title || 'ANKÜNFTE'}">
        </div>
        <div class="row">
          <label>Max Flüge</label>
          <input type="number" id="max_flights" value="${this._config.max_flights || 8}">
        </div>
        <h3>Status Farben (JSON)</h3>
        <textarea id="colors" rows="5" style="width: 100%; font-family: monospace;">${JSON.stringify(this._config.status_colors || [], null, 2)}</textarea>
      </div>
    `;

    // Picker Setup
    const picker = this.querySelector('#entity-picker');
    picker.hass = this._hass; // Initial Hass setzen
    picker.value = this._config.entity;
    picker.includeDomains = ['sensor']; // Filter nur auf Sensoren
    
    // Event Listener für Picker (Nutzt 'value-changed')
    picker.addEventListener('value-changed', (e) => {
        this.configChanged({ ...this._config, entity: e.target.value });
    });

    // Andere Inputs
    this.querySelector('#title').addEventListener('change', (e) => this.configChanged({ ...this._config, title: e.target.value }));
    this.querySelector('#max_flights').addEventListener('change', (e) => this.configChanged({ ...this._config, max_flights: parseInt(e.target.value) }));
    this.querySelector('#colors').addEventListener('change', (e) => {
      try {
        this.configChanged({ ...this._config, status_colors: JSON.parse(e.target.value) });
      } catch (err) {}
    });
  }
}

customElements.define('flightradar24-splitflap-editor', FlightRadar24SplitFlapEditor);
customElements.define('flightradar24-splitflap-card', FlightRadar24SplitFlapCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'flightradar24-splitflap-card',
  name: 'FlightRadar24 Split-Flap Card',
  description: 'Retro Anzeigetafel für Flugdaten',
  preview: true
});
