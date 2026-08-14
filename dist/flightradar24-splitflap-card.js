/**
 * Version of record for this card, logged on load so a user reporting an
 * issue can read the installed version straight out of the browser console
 * (HACS caching makes "latest" an unreliable assumption).
 *
 * Kept in sync with the release tag; see CLAUDE.md.
 */
const CARD_VERSION = '0.3.0';

console.info(
  `%c FLIGHTRADAR24-SPLITFLAP-CARD %c ${CARD_VERSION} `,
  'color: #1a1a1a; background: #ffa500; font-weight: 700;',
  'color: #ffa500; background: #1a1a1a; font-weight: 700;'
);

// FlightRadar24's generic status vocabulary -> translation key.
//
// Each flight carries both `status_text` (an English sentence built for
// display, e.g. "Estimated dep 07:40") and `status` (this machine-readable
// value). Only the latter is stable and language-independent, so it drives
// what the board shows; `status_text` is a last-resort fallback.
const STATUS_KEYS = {
  scheduled: 'scheduled',
  estimated: 'expected',
  departed: 'departed',
  landed: 'landed',
  delayed: 'delayed',
  diverted: 'diverted',
  canceled: 'canceled',
  cancelled: 'canceled'
};

/** Languages shipped in `translations/`. */
const SUPPORTED_LANGUAGES = ['en', 'de', 'es', 'fr'];

/**
 * English is bundled so the board never renders blank or half-built while a
 * translation file is still being fetched, and so it keeps working if the
 * fetch fails outright. Everything else is loaded at runtime from
 * `translations/<lang>.json`.
 *
 * Kept byte-identical to `translations/en.json`; `npm run check:i18n`
 * fails the build if the two drift apart or if a language is missing keys.
 */
export const FALLBACK_TRANSLATIONS = {
    "aircraft": "AIRCRAFT",
    "arrivals": "ARRIVALS",
    "canceled": "CANCELLED",
    "delayed": "DELAYED",
    "departed": "DEPARTED",
    "departures": "DEPARTURES",
    "diverted": "DIVERTED",
    "early": "EARLY",
    "editor.board": "Board direction",
    "editor.boardArrivals": "Arrivals",
    "editor.boardAuto": "Auto-detect",
    "editor.boardDepartures": "Departures",
    "editor.boardHelper": "Detected from the sensor. Override only if the airport column is labelled wrong.",
    "editor.entity": "Entity",
    "editor.entityHelper": "Select a FlightRadar24 arrivals or departures sensor",
    "editor.entityPlaceholder": "Select a sensor…",
    "editor.fieldAircraft": "Aircraft",
    "editor.fieldAirport": "Airport (from/to)",
    "editor.fieldFlight": "Flight number",
    "editor.fieldStatus": "Status",
    "editor.fieldTime": "Time",
    "editor.flipDelay": "Flip delay (ms)",
    "editor.flipDelayHelper": "Delay between character flips",
    "editor.flipDuration": "Flip duration (ms)",
    "editor.flipDurationHelper": "Duration of the flip animation",
    "editor.language": "Language",
    "editor.languageAuto": "Automatic",
    "editor.languageHelper": "Leave on automatic to follow Home Assistant",
    "editor.loading": "Loading…",
    "editor.maxFlights": "Maximum flights",
    "editor.maxFlightsHelper": "Number of rows to display (1-20)",
    "editor.title": "Title",
    "editor.titleHelper": "Leave empty to use the board direction",
    "editor.titlePlaceholder": "Automatic",
    "editor.visibleFields": "Visible columns",
    "editor.visibleFieldsHelper": "Choose which columns the board shows",
    "expected": "EXPECTED",
    "flight": "FLIGHT",
    "flights": "FLIGHTS",
    "from": "FROM",
    "landed": "LANDED",
    "noFlights": "No flights available",
    "ontime": "ON TIME",
    "scheduled": "SCHEDULED",
    "status": "STATUS",
    "time": "TIME",
    "to": "TO"
  };

/** Per-language cache of in-flight and resolved fetches, shared by all cards. */
const translationCache = new Map();

/**
 * @param {string} lang
 * @returns {Promise<Record<string, string>>}
 */
function loadTranslations(lang) {
  if (lang === 'en' || !SUPPORTED_LANGUAGES.includes(lang)) {
    return Promise.resolve(FALLBACK_TRANSLATIONS);
  }

  if (!translationCache.has(lang)) {
    const url = new URL(`translations/${lang}.json`, import.meta.url);
    translationCache.set(lang, fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      // A missing or malformed file must not take the card down with it —
      // English is already on screen and stays.
      .then(data => ({ ...FALLBACK_TRANSLATIONS, ...data }))
      .catch(error => {
        console.warn(
          `flightradar24-splitflap-card: could not load translations for "${lang}", falling back to English`,
          error
        );
        return FALLBACK_TRANSLATIONS;
      }));
  }

  return translationCache.get(lang);
}

class FlightRadar24SplitFlapCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.flights = [];
    this.displayedFlights = [];
    /** @type {Record<string, string>} */
    this._strings = FALLBACK_TRANSLATIONS;
  }

  /**
   * An explicit `language` wins; otherwise follow the Home Assistant UI,
   * falling back to English for languages this card doesn't ship yet.
   *
   * @returns {string}
   */
  resolveLanguage() {
    const configured = this.config?.language;
    if (configured) {
      return SUPPORTED_LANGUAGES.includes(configured) ? configured : 'en';
    }

    const hassLanguage = this._hass?.locale?.language || this._hass?.language;
    return SUPPORTED_LANGUAGES.includes(hassLanguage) ? hassLanguage : 'en';
  }

  /**
   * Swaps the card over to `lang` once its file has loaded. English renders
   * from the bundled copy immediately, so this never blocks a first paint.
   */
  applyLanguage() {
    const lang = this.resolveLanguage();
    if (lang === this._loadedLanguage) return;

    this._loadedLanguage = lang;
    loadTranslations(lang).then(strings => {
      // A later language change may have won the race while this was in
      // flight; only the most recent request may touch the DOM.
      if (this._loadedLanguage !== lang) return;

      this._strings = strings;
      this.flights = [];
      this.displayedFlights = [];
      this.render();
      if (this._hass) this.hass = this._hass;
    });
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }

    // Ensure visible_fields has proper defaults
    const defaultVisibleFields = {
      time: true,
      flight: true,
      airport: true,
      status: true,
      aircraft: true
    };

    // Merge user config with defaults
    const visible_fields = {
      ...defaultVisibleFields,
      ...(config.visible_fields || {})
    };

    // `from` and `to` used to be separate columns. A flight object only ever
    // names the *other* airport — the board's own airport is never in the
    // data — so there is one airport column whose meaning follows the board
    // direction. Old configs that hid `from` keep hiding the column.
    if (config.visible_fields && config.visible_fields.airport === undefined
        && config.visible_fields.from !== undefined) {
      visible_fields.airport = config.visible_fields.from;
    }
    delete visible_fields.from;
    delete visible_fields.to;

    // Default configuration
    this.config = {
      entity: config.entity,
      title: config.title || '',
      max_flights: config.max_flights || 8,
      flip_duration: config.flip_duration || 800,
      flip_delay: config.flip_delay || 50,
      // Deliberately not defaulted here: an unset language means "follow
      // Home Assistant", which is only knowable once hass arrives.
      language: config.language || '',
      board: config.board || 'auto',
      visible_fields: visible_fields
    };

    this.applyLanguage();
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.applyLanguage();

    const entity = hass.states[this.config.entity];

    if (!entity) {
      console.error('Entity not found:', this.config.entity);
      return;
    }

    // The first render happens in setConfig, before hass exists — so the
    // header was built without knowing the direction or the entity, and the
    // auto title fell back to a generic label. Rebuild the chrome once hass
    // arrives, and again whenever the direction changes.
    if (!this._renderedWithHass || this.getDirection() !== this._renderedDirection) {
      // render() replaces the whole shadow DOM, so the board has to be
      // rebuilt too. Clearing `flights` as well makes the diff below treat
      // the incoming list as new — otherwise an unchanged list would skip
      // the redraw and leave an empty board behind.
      this.flights = [];
      this.displayedFlights = [];
      this.render();
    }

    const newFlights = entity.attributes.flights || [];

    if (JSON.stringify(newFlights) !== JSON.stringify(this.flights)) {
      this.updateFlights(newFlights);
    }
  }

  /**
   * Arrivals and departures boards need opposite time fields and an opposite
   * airport label, but the direction cannot be read off a flight: a flight
   * object only names the other airport, never the board's own.
   *
   * The integration hardcodes a distinct icon per sensor
   * (`mdi:airplane-landing` vs `mdi:airplane-takeoff`), which is
   * language-independent and present even when the flight list is empty.
   * The entity ID is only a fallback, since IDs get renamed and are
   * localised in some installs.
   *
   * @returns {'arrivals' | 'departures'}
   */
  getDirection() {
    if (this.config.board === 'arrivals' || this.config.board === 'departures') {
      return this.config.board;
    }

    const icon = this._hass?.states[this.config.entity]?.attributes.icon;
    if (icon === 'mdi:airplane-takeoff') return 'departures';
    if (icon === 'mdi:airplane-landing') return 'arrivals';

    return /departure/i.test(this.config.entity) ? 'departures' : 'arrivals';
  }

  /**
   * @param {string} key
   * @param {Record<string, string | number>} [values] placeholder substitutions
   * @returns {string}
   */
  t(key, values) {
    const template = this._strings[key] || FALLBACK_TRANSLATIONS[key] || key;
    if (!values) return template;

    return template.replace(/\{(\w+)\}/g, (match, name) =>
      name in values ? String(values[name]) : match);
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
    const fields = {};
    const vf = this.config.visible_fields || {};
    const departures = this.getDirection() === 'departures';

    // A departures board is about when the flight leaves this airport; the
    // arrival time belongs to the far end of the route and would be wrong.
    const scheduledTs = departures
      ? flight.time_scheduled_departure
      : flight.time_scheduled_arrival;
    const scheduled = scheduledTs ? new Date(scheduledTs * 1000) : null;

    if (vf.time !== false) fields.time = scheduled ? this.formatTime(scheduled) : '--:--';
    if (vf.flight !== false) fields.flight = (flight.flight_number || flight.callsign || '').substring(0, 8).padEnd(8, ' ');
    if (vf.airport !== false) fields.airport = (flight.airport_city || flight.airport_code_iata || '').substring(0, 15).padEnd(15, ' ');
    if (vf.status !== false) fields.status = this.formatStatus(flight).substring(0, 12).padEnd(12, ' ');
    if (vf.aircraft !== false) fields.aircraft = (flight.aircraft_model || '').substring(0, 12).padEnd(12, ' ');

    return fields;
  }

  formatTime(date) {
    // hourCycle is pinned: airport boards are 24-hour everywhere, and an
    // "07:50 AM" would also overflow the fixed-width time column.
    return date.toLocaleTimeString(this.resolveLanguage(), {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    });
  }

  /**
   * The upstream `status_text` is an English sentence whose shape varies by
   * state and direction ("Estimated 07:37" vs "Estimated dep 07:40"), so it
   * can be neither translated nor safely shortened — cutting it to the
   * column width used to strip exactly the part that carried the meaning,
   * leaving "Estimated de".
   *
   * The `status` enum next to it is stable and language-independent, so it
   * is what the board shows. `status_text` is only used for states not in
   * the mapping, and then cut at a word boundary rather than mid-word.
   *
   * @param {Record<string, any>} flight
   * @returns {string}
   */
  formatStatus(flight) {
    const key = STATUS_KEYS[String(flight.status || '').toLowerCase()];
    if (key) return this.t(key);

    if (flight.status_text) return this.truncateAtWord(flight.status_text, 12);
    return this.t('expected');
  }

  /**
   * @param {string} text
   * @param {number} max
   * @returns {string}
   */
  truncateAtWord(text, max) {
    if (text.length <= max) return text;

    const cut = text.substring(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return lastSpace > 0 ? cut.substring(0, lastSpace) : cut;
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
    if (vf.airport !== false) fieldConfig.push({ name: 'airport', value: flight.airport, width: '180px' });
    if (vf.status !== false) fieldConfig.push({ name: 'status', value: flight.status, width: '130px' });
    if (vf.aircraft !== false) fieldConfig.push({ name: 'aircraft', value: flight.aircraft, width: '140px' });

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
    if (!this._hass?.states[this.config.entity]) return this.t('flights');

    return this.t(this.getDirection() === 'departures' ? 'departures' : 'arrivals');
  }

  render() {
    const vf = this.config.visible_fields || {};
    const headerCells = [];
    const departures = this.getDirection() === 'departures';

    // Remembered so `set hass` can tell when the direction resolves or
    // changes and the header has to be rebuilt.
    this._renderedDirection = departures ? 'departures' : 'arrivals';
    this._renderedWithHass = !!this._hass;

    if (vf.time !== false) headerCells.push({ text: this.t('time'), width: '60px' });
    if (vf.flight !== false) headerCells.push({ text: this.t('flight'), width: '100px' });
    if (vf.airport !== false) headerCells.push({ text: this.t(departures ? 'to' : 'from'), width: '180px' });
    if (vf.status !== false) headerCells.push({ text: this.t('status'), width: '130px' });
    if (vf.aircraft !== false) headerCells.push({ text: this.t('aircraft'), width: '140px' });

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
      board: 'auto',
      visible_fields: {
        time: true,
        flight: true,
        airport: true,
        status: true,
        aircraft: true
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
    /** @type {Record<string, string>} */
    this._strings = FALLBACK_TRANSLATIONS;
  }

  /**
   * @param {string} key
   * @returns {string}
   */
  t(key) {
    return this._strings[key] || FALLBACK_TRANSLATIONS[key] || key;
  }

  /** @returns {string} */
  resolveLanguage() {
    const configured = this._config?.language;
    if (configured) {
      return SUPPORTED_LANGUAGES.includes(configured) ? configured : 'en';
    }

    const hassLanguage = this._hass?.locale?.language || this._hass?.language;
    return SUPPORTED_LANGUAGES.includes(hassLanguage) ? hassLanguage : 'en';
  }

  applyLanguage() {
    const lang = this.resolveLanguage();
    if (lang === this._loadedLanguage) return;

    this._loadedLanguage = lang;
    loadTranslations(lang).then(strings => {
      if (this._loadedLanguage !== lang) return;

      this._strings = strings;
      this.render();
    });
  }

  setConfig(config) {
    this._config = {
      entity: '',
      title: '',
      language: '',
      max_flights: 8,
      flip_duration: 800,
      flip_delay: 50,
      board: 'auto',
      visible_fields: {
        time: true,
        flight: true,
        airport: true,
        status: true,
        aircraft: true
      },
      ...config
    };
    this.applyLanguage();
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.applyLanguage();
    if (!this._rendered) {
      this.render();
    }
  }

  /**
   * Airport arrival/departure boards are the only supported sensors.
   *
   * Two other FlightRadar24 sensor kinds must be kept out of the picker:
   * the statistics sub-sensors (_on_time, _delayed, ...) have no `flights`
   * attribute at all, and the area sensors do have one but carry live
   * position data instead of schedule data.
   *
   * `status_text` is the marker that only airport flights have. Entity IDs
   * can be renamed (and are localised in some setups), so it is only used
   * as a fallback when the list is empty and offers nothing to inspect.
   *
   * @param {string} entityId
   * @returns {boolean}
   */
  isAirportBoard(entityId) {
    const flights = this._hass.states[entityId].attributes.flights;
    if (!Array.isArray(flights)) return false;
    if (flights.length > 0) return flights[0].status_text !== undefined;
    return /airport_(arrivals|departures)/.test(entityId);
  }

  getFlightRadar24Entities() {
    if (!this._hass) return [];

    return Object.keys(this._hass.states)
      .filter(entityId => entityId.startsWith('sensor.flightradar24'))
      .filter(entityId => this.isAirportBoard(entityId))
      .map(entityId => ({
        value: entityId,
        label: this._hass.states[entityId].attributes.friendly_name || entityId
      }));
  }

  render() {
    if (!this._hass) {
      this.shadowRoot.innerHTML =
        `<div style="padding: 16px;">${this.t('editor.loading')}</div>`;
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
          <label for="entity">${this.t('editor.entity')} *</label>
          <select id="entity">
            <option value="">${this.t('editor.entityPlaceholder')}</option>
            ${entities.map(e => `
              <option value="${e.value}" ${config.entity === e.value ? 'selected' : ''}>
                ${e.label}
              </option>
            `).join('')}
          </select>
          <div class="helper">${this.t('editor.entityHelper')}</div>
        </div>

        <div class="config-row">
          <label for="title">${this.t('editor.title')}</label>
          <input type="text" id="title" value="${config.title || ''}" placeholder="${this.t('editor.titlePlaceholder')}">
          <div class="helper">${this.t('editor.titleHelper')}</div>
        </div>

        <div class="config-row">
          <label for="language">${this.t('editor.language')}</label>
          <select id="language">
            <option value="" ${!config.language ? 'selected' : ''}>${this.t('editor.languageAuto')}</option>
            <option value="en" ${config.language === 'en' ? 'selected' : ''}>English</option>
            <option value="de" ${config.language === 'de' ? 'selected' : ''}>Deutsch</option>
            <option value="es" ${config.language === 'es' ? 'selected' : ''}>Español</option>
            <option value="fr" ${config.language === 'fr' ? 'selected' : ''}>Français</option>
          </select>
          <div class="helper">${this.t('editor.languageHelper')}</div>
        </div>

        <div class="config-row">
          <label for="max_flights">${this.t('editor.maxFlights')}</label>
          <input type="number" id="max_flights" value="${config.max_flights || 8}" min="1" max="20">
          <div class="helper">${this.t('editor.maxFlightsHelper')}</div>
        </div>

        <div class="config-row">
          <label for="flip_duration">${this.t('editor.flipDuration')}</label>
          <input type="number" id="flip_duration" value="${config.flip_duration || 800}" min="200" max="2000" step="100">
          <div class="helper">${this.t('editor.flipDurationHelper')}</div>
        </div>

        <div class="config-row">
          <label for="flip_delay">${this.t('editor.flipDelay')}</label>
          <input type="number" id="flip_delay" value="${config.flip_delay || 50}" min="10" max="200" step="10">
          <div class="helper">${this.t('editor.flipDelayHelper')}</div>
        </div>

        <div class="config-row">
          <label for="board">${this.t('editor.board')}</label>
          <select id="board">
            <option value="auto" ${config.board !== 'arrivals' && config.board !== 'departures' ? 'selected' : ''}>${this.t('editor.boardAuto')}</option>
            <option value="arrivals" ${config.board === 'arrivals' ? 'selected' : ''}>${this.t('editor.boardArrivals')}</option>
            <option value="departures" ${config.board === 'departures' ? 'selected' : ''}>${this.t('editor.boardDepartures')}</option>
          </select>
          <div class="helper">${this.t('editor.boardHelper')}</div>
        </div>

        <div class="config-row">
          <label>${this.t('editor.visibleFields')}</label>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="show_time" ${vf.time !== false ? 'checked' : ''}>
              <label for="show_time">${this.t('editor.fieldTime')}</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_flight" ${vf.flight !== false ? 'checked' : ''}>
              <label for="show_flight">${this.t('editor.fieldFlight')}</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_airport" ${vf.airport !== false ? 'checked' : ''}>
              <label for="show_airport">${this.t('editor.fieldAirport')}</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_status" ${vf.status !== false ? 'checked' : ''}>
              <label for="show_status">${this.t('editor.fieldStatus')}</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_aircraft" ${vf.aircraft !== false ? 'checked' : ''}>
              <label for="show_aircraft">${this.t('editor.fieldAircraft')}</label>
            </div>
          </div>
          <div class="helper">${this.t('editor.visibleFieldsHelper')}</div>
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
    this.shadowRoot.getElementById('board')?.addEventListener('change', () => this.valueChanged());

    this.shadowRoot.getElementById('show_time')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_flight')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_airport')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_status')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_aircraft')?.addEventListener('change', () => this.valueChanged());
  }

  /**
   * @param {string} id
   * @returns {HTMLInputElement | null}
   */
  getInput(id) {
    return /** @type {HTMLInputElement | null} */ (this.shadowRoot.getElementById(id));
  }

  /**
   * @param {string} id
   * @returns {HTMLSelectElement | null}
   */
  getSelect(id) {
    return /** @type {HTMLSelectElement | null} */ (this.shadowRoot.getElementById(id));
  }

  valueChanged() {
    const newConfig = {
      entity: this.getSelect('entity')?.value || '',
      title: this.getInput('title')?.value || '',
      language: this.getSelect('language')?.value || '',
      max_flights: parseInt(this.getInput('max_flights')?.value) || 8,
      flip_duration: parseInt(this.getInput('flip_duration')?.value) || 800,
      flip_delay: parseInt(this.getInput('flip_delay')?.value) || 50,
      board: this.getSelect('board')?.value || 'auto',
      visible_fields: {
        time: this.getInput('show_time')?.checked !== false,
        flight: this.getInput('show_flight')?.checked !== false,
        airport: this.getInput('show_airport')?.checked !== false,
        status: this.getInput('show_status')?.checked !== false,
        aircraft: this.getInput('show_aircraft')?.checked !== false
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
