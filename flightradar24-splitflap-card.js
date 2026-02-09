// Translations
const translations = {
  en: {
    arrivals: "ARRIVALS",
    departures: "DEPARTURES", 
    flights: "FLIGHTS",
    time: "TIME",
    flight: "FLIGHT",
    from: "FROM",
    to: "TO",
    status: "STATUS",
    aircraft: "AIRCRAFT",
    altitude: "ALTITUDE",
    speed: "SPEED",
    landed: "LANDED",
    expected: "EXPECTED",
    delayed: "DELAYED",
    early: "EARLY",
    departed: "DEPARTED",
    ontime: "ON TIME",
    noFlights: "No flights available"
  },
  de: {
    arrivals: "ANKÜNFTE",
    departures: "ABFLÜGE",
    flights: "FLÜGE",
    time: "ZEIT",
    flight: "FLUG",
    from: "VON",
    to: "NACH",
    status: "STATUS",
    aircraft: "FLUGZEUG",
    altitude: "HÖHE",
    speed: "GESCHW.",
    landed: "GELANDET",
    expected: "ERWARTET",
    delayed: "VERSPÄTET",
    early: "FRÜHER",
    departed: "ABGEFLOGEN",
    ontime: "PÜNKTLICH",
    noFlights: "Keine Flüge verfügbar"
  },
  es: {
    arrivals: "LLEGADAS",
    departures: "SALIDAS",
    flights: "VUELOS",
    time: "HORA",
    flight: "VUELO",
    from: "DESDE",
    to: "HASTA",
    status: "ESTADO",
    aircraft: "AVIÓN",
    altitude: "ALTITUD",
    speed: "VELOCIDAD",
    landed: "ATERRIZADO",
    expected: "ESPERADO",
    delayed: "RETRASADO",
    early: "TEMPRANO",
    departed: "DESPEGADO",
    ontime: "A TIEMPO",
    noFlights: "No hay vuelos disponibles"
  },
  fr: {
    arrivals: "ARRIVÉES",
    departures: "DÉPARTS",
    flights: "VOLS",
    time: "HEURE",
    flight: "VOL",
    from: "DE",
    to: "À",
    status: "STATUT",
    aircraft: "AVION",
    altitude: "ALTITUDE",
    speed: "VITESSE",
    landed: "ATTERRI",
    expected: "ATTENDU",
    delayed: "RETARDÉ",
    early: "EN AVANCE",
    departed: "DÉCOLLÉ",
    ontime: "À L'HEURE",
    noFlights: "Aucun vol disponible"
  }
};

class FlightRadar24SplitFlapCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.flights = [];
    this.displayedFlights = [];
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }

    // Ensure visible_fields has proper defaults
    const defaultVisibleFields = {
      time: true,
      flight: true,
      from: true,
      to: false,
      status: true,
      aircraft: true,
      altitude: false,
      speed: false
    };

    // Merge user config with defaults
    const visible_fields = config.visible_fields ? {
      ...defaultVisibleFields,
      ...config.visible_fields
    } : defaultVisibleFields;

    // Default configuration
    this.config = {
      entity: config.entity,
      title: config.title || '',
      max_flights: config.max_flights || 8,
      flip_duration: config.flip_duration || 800,
      flip_delay: config.flip_delay || 50,
      mode: config.mode || 'auto',
      language: config.language || 'en',
      visible_fields: visible_fields
    };

    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    const entity = hass.states[this.config.entity];
    
    if (!entity) {
      console.error('Entity not found:', this.config.entity);
      return;
    }

    const newFlights = entity.attributes.flights || [];
    
    if (JSON.stringify(newFlights) !== JSON.stringify(this.flights)) {
      this.updateFlights(newFlights);
    }
  }

  t(key) {
    const lang = this.config.language || 'en';
    return translations[lang]?.[key] || translations.en[key] || key;
  }

  detectMode(flight) {
    if (this.config.mode !== 'auto') {
      return this.config.mode;
    }
    return flight.status_text !== undefined ? 'airport' : 'area';
  }

  updateFlights(newFlights) {
    this.flights = newFlights.slice(0, this.config.max_flights);
    
    if (this.displayedFlights.length === 0) {
      this.displayedFlights = this.flights.map(f => this.formatFlight(f));
      this.renderFlightBoard();
      return;
    }

    this.flights.forEach((flight, index) => {
      const newData = this.formatFlight(flight);
      const oldData = this.displayedFlights[index];
      
      if (JSON.stringify(newData) !== JSON.stringify(oldData)) {
        this.animateRow(index, oldData, newData);
      }
    });
  }

  formatFlight(flight) {
    const mode = this.detectMode(flight);
    const fields = {};
    const vf = this.config.visible_fields || {};

    if (mode === 'airport') {
      const scheduled = flight.time_scheduled_arrival ? 
        new Date(flight.time_scheduled_arrival * 1000) : null;
      
      if (vf.time !== false) fields.time = scheduled ? this.formatTime(scheduled) : '--:--';
      if (vf.flight !== false) fields.flight = (flight.flight_number || flight.callsign || '').substring(0, 8).padEnd(8, ' ');
      if (vf.from !== false) fields.from = (flight.airport_city || flight.airport_origin_city || '').substring(0, 15).padEnd(15, ' ');
      if (vf.to === true) fields.to = (flight.airport_destination_city || '').substring(0, 15).padEnd(15, ' ');
      if (vf.status !== false) fields.status = (flight.status_text || this.t('expected')).substring(0, 12).padEnd(12, ' ');
      if (vf.aircraft !== false) fields.aircraft = (flight.aircraft_model || '').substring(0, 12).padEnd(12, ' ');
      if (vf.altitude === true) fields.altitude = this.formatAltitude(flight.altitude);
      if (vf.speed === true) fields.speed = this.formatSpeed(flight.ground_speed);
    } else {
      const scheduled = flight.time_scheduled_arrival ? 
        new Date(flight.time_scheduled_arrival * 1000) : null;
      const estimated = flight.time_estimated_arrival ? 
        new Date(flight.time_estimated_arrival * 1000) : null;
      
      if (vf.time !== false) fields.time = scheduled ? this.formatTime(scheduled) : '--:--';
      if (vf.flight !== false) fields.flight = (flight.flight_number || flight.callsign || '').substring(0, 8).padEnd(8, ' ');
      if (vf.from !== false) fields.from = (flight.airport_origin_code_iata || flight.airport_origin_city || '').substring(0, 15).padEnd(15, ' ');
      if (vf.to === true) fields.to = (flight.airport_destination_code_iata || flight.airport_destination_city || '').substring(0, 15).padEnd(15, ' ');
      if (vf.status !== false) fields.status = this.getAreaStatus(flight, scheduled, estimated);
      if (vf.aircraft !== false) fields.aircraft = (flight.aircraft_model || '').substring(0, 12).padEnd(12, ' ');
      if (vf.altitude === true) fields.altitude = this.formatAltitude(flight.altitude);
      if (vf.speed === true) fields.speed = this.formatSpeed(flight.ground_speed);
    }

    return fields;
  }

  formatTime(date) {
    return date.toLocaleTimeString(this.config.language || 'en', { hour: '2-digit', minute: '2-digit' });
  }

  formatAltitude(alt) {
    if (!alt) return '     ';
    return `${Math.round(alt)}ft`.substring(0, 8).padEnd(8, ' ');
  }

  formatSpeed(speed) {
    if (!speed) return '     ';
    return `${Math.round(speed)}kts`.substring(0, 8).padEnd(8, ' ');
  }

  getAreaStatus(flight, scheduled, estimated) {
    if (flight.on_ground === 1) return this.t('landed').substring(0, 12).padEnd(12, ' ');
    if (estimated && scheduled) {
      const diff = Math.round((estimated - scheduled) / 60000);
      if (diff > 15) return `+${diff} MIN`.substring(0, 12).padEnd(12, ' ');
      if (diff < -5) return this.t('early').substring(0, 12).padEnd(12, ' ');
    }
    return this.t('expected').substring(0, 12).padEnd(12, ' ');
  }

  animateRow(rowIndex, oldData, newData) {
    const row = this.shadowRoot.querySelector(`[data-row="${rowIndex}"]`);
    if (!row) return;

    const fields = Object.keys(newData);
    fields.forEach((field, fieldIndex) => {
      const oldText = oldData[field] || '';
      const newText = newData[field] || '';
      
      if (oldText !== newText) {
        this.animateField(row, field, oldText, newText, fieldIndex * 100);
      }
    });

    this.displayedFlights[rowIndex] = newData;
  }

  animateField(row, fieldName, oldText, newText, baseDelay) {
    const cell = row.querySelector(`[data-field="${fieldName}"]`);
    if (!cell) return;

    const chars = cell.querySelectorAll('.flap-char');
    const maxLen = Math.max(oldText.length, newText.length);

    for (let i = 0; i < maxLen; i++) {
      const oldChar = oldText[i] || ' ';
      const newChar = newText[i] || ' ';
      
      if (oldChar !== newChar && chars[i]) {
        this.flipCharacter(chars[i], oldChar, newChar, baseDelay + i * this.config.flip_delay);
      }
    }
  }

  flipCharacter(element, oldChar, newChar, delay) {
    setTimeout(() => {
      element.classList.add('flipping');
      
      setTimeout(() => {
        element.textContent = newChar;
        element.classList.remove('flipping');
      }, this.config.flip_duration / 2);
      
    }, delay);
  }

  renderFlightBoard() {
    const board = this.shadowRoot.querySelector('.flight-board');
    if (!board) return;

    board.innerHTML = '';
    
    if (this.displayedFlights.length === 0) {
      const noFlights = document.createElement('div');
      noFlights.className = 'no-flights';
      noFlights.textContent = this.t('noFlights');
      board.appendChild(noFlights);
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

    const fieldConfig = [];
    const vf = this.config.visible_fields || {};
    
    if (vf.time !== false) fieldConfig.push({ name: 'time', value: flight.time, width: '60px' });
    if (vf.flight !== false) fieldConfig.push({ name: 'flight', value: flight.flight, width: '100px' });
    if (vf.from !== false) fieldConfig.push({ name: 'from', value: flight.from, width: '180px' });
    if (vf.to === true) fieldConfig.push({ name: 'to', value: flight.to, width: '180px' });
    if (vf.status !== false) fieldConfig.push({ name: 'status', value: flight.status, width: '130px' });
    if (vf.aircraft !== false) fieldConfig.push({ name: 'aircraft', value: flight.aircraft, width: '140px' });
    if (vf.altitude === true) fieldConfig.push({ name: 'altitude', value: flight.altitude, width: '100px' });
    if (vf.speed === true) fieldConfig.push({ name: 'speed', value: flight.speed, width: '100px' });

    fieldConfig.forEach(field => {
      const cell = document.createElement('div');
      cell.className = 'flight-cell';
      cell.setAttribute('data-field', field.name);
      cell.style.width = field.width;
      cell.style.flexShrink = '0';
      
      for (const char of field.value) {
        const charSpan = document.createElement('span');
        charSpan.className = 'flap-char';
        charSpan.textContent = char;
        cell.appendChild(charSpan);
      }
      
      row.appendChild(cell);
    });

    return row;
  }

  getTitle() {
    if (this.config.title) return this.config.title;
    
    const entity = this._hass?.states[this.config.entity];
    if (!entity) return this.t('flights');
    
    const entityId = this.config.entity.toLowerCase();
    if (entityId.includes('arrival')) return this.t('arrivals');
    if (entityId.includes('departure')) return this.t('departures');
    
    return this.t('flights');
  }

  render() {
    const vf = this.config.visible_fields || {};
    const headerCells = [];
    
    if (vf.time !== false) headerCells.push({ text: this.t('time'), width: '60px' });
    if (vf.flight !== false) headerCells.push({ text: this.t('flight'), width: '100px' });
    if (vf.from !== false) headerCells.push({ text: this.t('from'), width: '180px' });
    if (vf.to === true) headerCells.push({ text: this.t('to'), width: '180px' });
    if (vf.status !== false) headerCells.push({ text: this.t('status'), width: '130px' });
    if (vf.aircraft !== false) headerCells.push({ text: this.t('aircraft'), width: '140px' });
    if (vf.altitude === true) headerCells.push({ text: this.t('altitude'), width: '100px' });
    if (vf.speed === true) headerCells.push({ text: this.t('speed'), width: '100px' });

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 16px;
          container-type: inline-size;
        }

        .card-header {
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 100%);
          color: #ffa500;
          padding: 16px;
          text-align: center;
          font-size: clamp(18px, 4cqi, 24px);
          font-weight: bold;
          letter-spacing: 4px;
          border-radius: 8px 8px 0 0;
          font-family: 'Courier New', monospace;
          box-shadow: inset 0 -2px 4px rgba(0,0,0,0.3);
        }

        .header-row {
          display: flex;
          background: #2a2a2a;
          padding: 8px 12px;
          color: #ffa500;
          font-size: clamp(10px, 2cqi, 12px);
          font-weight: bold;
          letter-spacing: 2px;
          font-family: 'Courier New', monospace;
          border-bottom: 2px solid #444;
          overflow-x: auto;
        }

        .header-cell {
          flex-shrink: 0;
          padding: 0 4px;
        }

        .flight-board {
          background: #1a1a1a;
          border-radius: 0 0 8px 8px;
          overflow-x: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          min-height: 100px;
        }

        .flight-row {
          display: flex;
          padding: 4px 12px;
          border-bottom: 1px solid #333;
          min-height: 48px;
          align-items: center;
          background: linear-gradient(180deg, #222 0%, #1a1a1a 100%);
        }

        .flight-row:last-child {
          border-bottom: none;
        }

        .flight-row:hover {
          background: linear-gradient(180deg, #2a2a2a 0%, #222 100%);
        }

        .flight-cell {
          display: flex;
          gap: 2px;
          padding: 0 4px;
        }

        .flap-char {
          display: inline-block;
          width: clamp(10px, 2.5cqi, 12px);
          height: 32px;
          line-height: 32px;
          text-align: center;
          background: linear-gradient(180deg, #2a2a2a 0%, #1a1a1a 48%, #0a0a0a 52%, #1a1a1a 100%);
          color: #e8e8e8;
          font-family: 'Courier New', monospace;
          font-size: clamp(14px, 3.5cqi, 18px);
          font-weight: bold;
          border-radius: 2px;
          box-shadow: 
            inset 0 1px 0 rgba(255,255,255,0.1),
            inset 0 -1px 0 rgba(0,0,0,0.5),
            0 1px 2px rgba(0,0,0,0.3);
          position: relative;
          transition: transform 0.1s ease;
        }

        .flap-char:before {
          content: '';
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          height: 1px;
          background: rgba(0,0,0,0.6);
          box-shadow: 0 1px 0 rgba(255,255,255,0.05);
        }

        .flap-char.flipping {
          animation: flip ${this.config.flip_duration}ms ease-in-out;
        }

        @keyframes flip {
          0% {
            transform: scaleY(1);
          }
          25% {
            transform: scaleY(0.8);
            filter: brightness(1.2);
          }
          50% {
            transform: scaleY(0.1);
            filter: brightness(1.5);
          }
          75% {
            transform: scaleY(0.8);
            filter: brightness(1.2);
          }
          100% {
            transform: scaleY(1);
          }
        }

        .no-flights {
          padding: 40px;
          text-align: center;
          color: #666;
          font-family: 'Courier New', monospace;
        }

        @container (max-width: 600px) {
          .header-row {
            font-size: 10px;
          }
          .flap-char {
            width: 10px;
            font-size: 14px;
            height: 28px;
            line-height: 28px;
          }
        }
      </style>

      <div class="card-header">${this.getTitle()}</div>
      <div class="header-row">
        ${headerCells.map(cell => `<div class="header-cell" style="width: ${cell.width}">${cell.text}</div>`).join('')}
      </div>
      <div class="flight-board"></div>
    `;

    if (this.displayedFlights.length > 0) {
      this.renderFlightBoard();
    }
  }

  getCardSize() {
    return 3;
  }

  static getLayoutOptions() {
    return {
      grid_rows: 3,
      grid_columns: 12,
      grid_min_rows: 2,
      grid_max_rows: 6,
      grid_min_columns: 6
    };
  }

  static getStubConfig() {
    return {
      entity: '',
      max_flights: 8,
      language: 'en',
      visible_fields: {
        time: true,
        flight: true,
        from: true,
        to: false,
        status: true,
        aircraft: true,
        altitude: false,
        speed: false
      }
    };
  }

  static getConfigElement() {
    return document.createElement('flightradar24-splitflap-card-editor');
  }
}

class FlightRadar24SplitFlapCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = {
      entity: '',
      title: '',
      language: 'en',
      max_flights: 8,
      flip_duration: 800,
      flip_delay: 50,
      mode: 'auto',
      visible_fields: {
        time: true,
        flight: true,
        from: true,
        to: false,
        status: true,
        aircraft: true,
        altitude: false,
        speed: false
      },
      ...config
    };
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) {
      this.render();
    }
  }

  getFlightRadar24Entities() {
    if (!this._hass) return [];
    
    return Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('sensor.flightradar24'))
      .map(entityId => ({
        value: entityId,
        label: this._hass.states[entityId].attributes.friendly_name || entityId
      }));
  }

  render() {
    if (!this._hass) {
      this.shadowRoot.innerHTML = '<div style="padding: 16px;">Loading...</div>';
      return;
    }

    this._rendered = true;
    const entities = this.getFlightRadar24Entities();
    const config = this._config;
    const vf = config.visible_fields || {};

    this.shadowRoot.innerHTML = `
      <style>
        .card-config {
          padding: 16px;
        }
        .config-row {
          margin-bottom: 16px;
        }
        label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 14px;
        }
        .helper {
          font-size: 12px;
          color: var(--secondary-text-color);
          margin-top: 4px;
        }
        select, input[type="text"], input[type="number"] {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color);
          border-radius: 4px;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-size: 14px;
          box-sizing: border-box;
        }
        .checkbox-group {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 8px;
          margin-top: 8px;
        }
        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .checkbox-item input[type="checkbox"] {
          width: auto;
          margin: 0;
        }
        .checkbox-item label {
          margin: 0;
          font-weight: normal;
        }
      </style>
      
      <div class="card-config">
        <div class="config-row">
          <label for="entity">Entity *</label>
          <select id="entity">
            <option value="">Select FlightRadar24 sensor...</option>
            ${entities.map(e => `
              <option value="${e.value}" ${config.entity === e.value ? 'selected' : ''}>
                ${e.label}
              </option>
            `).join('')}
          </select>
          <div class="helper">Select a FlightRadar24 sensor entity</div>
        </div>

        <div class="config-row">
          <label for="title">Title (optional)</label>
          <input type="text" id="title" value="${config.title || ''}" placeholder="Leave empty for auto">
          <div class="helper">Display title (leave empty for auto-detect)</div>
        </div>

        <div class="config-row">
          <label for="language">Language</label>
          <select id="language">
            <option value="en" ${config.language === 'en' ? 'selected' : ''}>English</option>
            <option value="de" ${config.language === 'de' ? 'selected' : ''}>Deutsch</option>
            <option value="es" ${config.language === 'es' ? 'selected' : ''}>Español</option>
            <option value="fr" ${config.language === 'fr' ? 'selected' : ''}>Français</option>
          </select>
          <div class="helper">Display language</div>
        </div>

        <div class="config-row">
          <label for="max_flights">Maximum Flights</label>
          <input type="number" id="max_flights" value="${config.max_flights || 8}" min="1" max="20">
          <div class="helper">Number of flights to display (1-20)</div>
        </div>

        <div class="config-row">
          <label for="flip_duration">Flip Duration (ms)</label>
          <input type="number" id="flip_duration" value="${config.flip_duration || 800}" min="200" max="2000" step="100">
          <div class="helper">Duration of flip animation</div>
        </div>

        <div class="config-row">
          <label for="flip_delay">Flip Delay (ms)</label>
          <input type="number" id="flip_delay" value="${config.flip_delay || 50}" min="10" max="200" step="10">
          <div class="helper">Delay between character flips</div>
        </div>

        <div class="config-row">
          <label for="mode">Sensor Mode</label>
          <select id="mode">
            <option value="auto" ${config.mode === 'auto' ? 'selected' : ''}>Auto-detect</option>
            <option value="airport" ${config.mode === 'airport' ? 'selected' : ''}>Airport</option>
            <option value="area" ${config.mode === 'area' ? 'selected' : ''}>Area</option>
          </select>
          <div class="helper">Sensor type detection</div>
        </div>

        <div class="config-row">
          <label>Visible Fields</label>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="show_time" ${vf.time !== false ? 'checked' : ''}>
              <label for="show_time">Time</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_flight" ${vf.flight !== false ? 'checked' : ''}>
              <label for="show_flight">Flight Number</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_from" ${vf.from !== false ? 'checked' : ''}>
              <label for="show_from">From</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_to" ${vf.to === true ? 'checked' : ''}>
              <label for="show_to">To</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_status" ${vf.status !== false ? 'checked' : ''}>
              <label for="show_status">Status</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_aircraft" ${vf.aircraft !== false ? 'checked' : ''}>
              <label for="show_aircraft">Aircraft</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_altitude" ${vf.altitude === true ? 'checked' : ''}>
              <label for="show_altitude">Altitude</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_speed" ${vf.speed === true ? 'checked' : ''}>
              <label for="show_speed">Speed</label>
            </div>
          </div>
          <div class="helper">Select which fields to display</div>
        </div>
      </div>
    `;

    // Add event listeners
    this.shadowRoot.getElementById('entity')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('title')?.addEventListener('input', () => this.valueChanged());
    this.shadowRoot.getElementById('language')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('max_flights')?.addEventListener('input', () => this.valueChanged());
    this.shadowRoot.getElementById('flip_duration')?.addEventListener('input', () => this.valueChanged());
    this.shadowRoot.getElementById('flip_delay')?.addEventListener('input', () => this.valueChanged());
    this.shadowRoot.getElementById('mode')?.addEventListener('change', () => this.valueChanged());
    
    this.shadowRoot.getElementById('show_time')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_flight')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_from')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_to')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_status')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_aircraft')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_altitude')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_speed')?.addEventListener('change', () => this.valueChanged());
  }

  valueChanged() {
    const newConfig = {
      entity: this.shadowRoot.getElementById('entity')?.value || '',
      title: this.shadowRoot.getElementById('title')?.value || '',
      language: this.shadowRoot.getElementById('language')?.value || 'en',
      max_flights: parseInt(this.shadowRoot.getElementById('max_flights')?.value) || 8,
      flip_duration: parseInt(this.shadowRoot.getElementById('flip_duration')?.value) || 800,
      flip_delay: parseInt(this.shadowRoot.getElementById('flip_delay')?.value) || 50,
      mode: this.shadowRoot.getElementById('mode')?.value || 'auto',
      visible_fields: {
        time: this.shadowRoot.getElementById('show_time')?.checked !== false,
        flight: this.shadowRoot.getElementById('show_flight')?.checked !== false,
        from: this.shadowRoot.getElementById('show_from')?.checked !== false,
        to: this.shadowRoot.getElementById('show_to')?.checked === true,
        status: this.shadowRoot.getElementById('show_status')?.checked !== false,
        aircraft: this.shadowRoot.getElementById('show_aircraft')?.checked !== false,
        altitude: this.shadowRoot.getElementById('show_altitude')?.checked === true,
        speed: this.shadowRoot.getElementById('show_speed')?.checked === true
      }
    };
    
    const event = new CustomEvent('config-changed', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true
    });
    this.dispatchEvent(event);
  }
}

customElements.define('flightradar24-splitflap-card', FlightRadar24SplitFlapCard);
customElements.define('flightradar24-splitflap-card-editor', FlightRadar24SplitFlapCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'flightradar24-splitflap-card',
  name: 'FlightRadar24 Split-Flap Card',
  description: 'A split-flap airport display for FlightRadar24 flight data',
  preview: true,
  documentationURL: 'https://github.com/GpsM2/flightradar24-splitflap-card'
});
