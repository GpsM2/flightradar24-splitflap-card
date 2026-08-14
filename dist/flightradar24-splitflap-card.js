/**
 * Version of record for this card, logged on load so a user reporting an
 * issue can read the installed version straight out of the browser console
 * (HACS caching makes "latest" an unreliable assumption).
 *
 * Kept in sync with the release tag; see CLAUDE.md.
 */
const CARD_VERSION = '0.4.0';

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

/**
 * Minutes of deviation before a flight stops counting as on time. Airlines
 * conventionally treat under 15 minutes as punctual; the board is stricter
 * because a viewer is deciding whether to leave for the airport now.
 */
const DELAY_THRESHOLD_MINUTES = 5;
const EARLY_THRESHOLD_MINUTES = 5;

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
    "delayMinutes": "+{minutes} MIN",
    "delayed": "DELAYED",
    "departed": "DEPARTED",
    "departures": "DEPARTURES",
    "diverted": "DIVERTED",
    "early": "EARLY",
    "earlyMinutes": "-{minutes} MIN",
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
    "editor.fieldExpected": "Expected time",
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
    "editor.theme": "Appearance",
    "editor.themeAuto": "Follow Home Assistant",
    "editor.themeDark": "Dark",
    "editor.themeHelper": "Follows the Home Assistant theme unless overridden",
    "editor.themeLight": "Light",
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
    /** Pending flip timers, so they can be cancelled on removal. */
    this._timers = new Set();
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
      expected: true,
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
      theme: config.theme || 'auto',
      visible_fields: visible_fields
    };

    this.applyLanguage();
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.applyLanguage();
    // Cheap enough to redo on every update, and it keeps the board in step
    // when the dashboard is switched between light and dark.
    if (this.shadowRoot.querySelector('.frame')) this.applyTheme();

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
    const cancelled = /^cancell?ed$/.test(String(flight.status || '').toLowerCase());

    // A cancelled flight has no time worth reading; real boards blank it out
    // rather than leave a time that will never happen.
    if (vf.time !== false) {
      fields.time = cancelled ? '--:--' : (scheduled ? this.formatTime(scheduled) : '--:--');
    }
    if (vf.expected !== false) fields.expected = this.formatExpected(flight, cancelled);
    if (vf.flight !== false) fields.flight = (flight.flight_number || flight.callsign || '').substring(0, 8).padEnd(8, ' ');
    if (vf.airport !== false) fields.airport = (flight.airport_city || flight.airport_code_iata || '').substring(0, 15).padEnd(15, ' ');
    if (vf.status !== false) fields.status = this.formatStatus(flight).substring(0, 12).padEnd(12, ' ');
    if (vf.aircraft !== false) fields.aircraft = this.truncateAtWord(flight.aircraft_model || '', 14).padEnd(14, ' ');

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
   * The time the flight is actually expected at, once that is known and
   * differs from the schedule. Left blank otherwise, so a filled cell in
   * this column always means "this is not running to plan".
   *
   * @param {Record<string, any>} flight
   * @param {boolean} cancelled
   * @returns {string}
   */
  formatExpected(flight, cancelled) {
    const blank = ' '.repeat(5);
    if (cancelled) return blank;

    const departures = this.getDirection() === 'departures';
    const actual = departures ? flight.time_real_departure : flight.time_real_arrival;
    const estimated = departures ? flight.time_estimated_departure : flight.time_estimated_arrival;

    const reference = actual || estimated;
    if (!reference) return blank;

    const minutes = this.getDelayMinutes(flight);
    if (minutes !== null && Math.abs(minutes) < DELAY_THRESHOLD_MINUTES) return blank;

    return this.formatTime(new Date(reference * 1000));
  }

  /**
   * Minutes between the scheduled time and the best available replacement
   * for it — the actual time once it exists, the estimate before that.
   * Positive is late, negative is early, null when there is nothing to
   * compare against.
   *
   * @param {Record<string, any>} flight
   * @returns {number | null}
   */
  getDelayMinutes(flight) {
    const departures = this.getDirection() === 'departures';
    const scheduled = departures ? flight.time_scheduled_departure : flight.time_scheduled_arrival;
    const actual = departures ? flight.time_real_departure : flight.time_real_arrival;
    const estimated = departures ? flight.time_estimated_departure : flight.time_estimated_arrival;

    const reference = actual || estimated;
    if (!scheduled || !reference) return null;

    return Math.round((reference - scheduled) / 60);
  }

  /**
   * The board's own view of a flight, combining the upstream `status` enum
   * with the computed delay. The enum alone can't say "eight minutes late",
   * and the delay alone can't say "cancelled".
   *
   * `tone` drives colour only, so the meaning survives for anyone who can't
   * distinguish the colours.
   *
   * @param {Record<string, any>} flight
   * @returns {{text: string, tone: string}}
   */
  getFlightState(flight) {
    const status = String(flight.status || '').toLowerCase();

    if (status === 'canceled' || status === 'cancelled') {
      return { text: this.t('canceled'), tone: 'alert' };
    }
    if (status === 'diverted') return { text: this.t('diverted'), tone: 'alert' };
    if (status === 'landed') return { text: this.t('landed'), tone: 'done' };
    if (status === 'departed') return { text: this.t('departed'), tone: 'done' };

    const minutes = this.getDelayMinutes(flight);
    if (minutes !== null) {
      if (minutes >= DELAY_THRESHOLD_MINUTES) {
        return { text: this.t('delayMinutes', { minutes }), tone: 'alert' };
      }
      if (minutes <= -EARLY_THRESHOLD_MINUTES) {
        return { text: this.t('earlyMinutes', { minutes: Math.abs(minutes) }), tone: 'ok' };
      }
      return { text: this.t('ontime'), tone: 'ok' };
    }

    // No time to compare against yet: report the raw state instead of
    // implying punctuality nobody has confirmed.
    if (status === 'delayed') return { text: this.t('delayed'), tone: 'alert' };
    if (STATUS_KEYS[status]) return { text: this.t(STATUS_KEYS[status]), tone: 'neutral' };

    if (flight.status_text) {
      return { text: this.truncateAtWord(flight.status_text, 12), tone: 'neutral' };
    }
    return { text: this.t('scheduled'), tone: 'neutral' };
  }

  /**
   * @param {Record<string, any>} flight
   * @returns {string}
   */
  formatStatus(flight) {
    return this.getFlightState(flight).text;
  }

  /**
   * Cuts at the last space *or* hyphen at or before `max`, whichever is
   * closer — aircraft models are compound tokens like "A320-214", where a
   * space-only rule would throw away the whole family to avoid a mid-token
   * cut ("Airbus A320-214" -> "Airbus", losing "A320" along with "214").
   *
   * @param {string} text
   * @param {number} max
   * @returns {string}
   */
  truncateAtWord(text, max) {
    if (text.length <= max) return text;

    const cut = text.substring(0, max);
    const boundary = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('-'));
    return boundary > 0 ? cut.substring(0, boundary) : cut;
  }

  animateRow(rowIndex, oldData, newData) {
    const fields = Object.keys(newData);
    fields.forEach((field, fieldIndex) => {
      const oldText = oldData[field] || '';
      const newText = newData[field] || '';

      if (oldText !== newText) {
        this.animateField(rowIndex, field, oldText, newText, fieldIndex * 100);
      }
    });

    // The tiles animate their own characters, but the status colour is a
    // class on the cell and would otherwise keep the previous state's tone.
    const statusCell = /** @type {HTMLElement | null} */ (
      this.shadowRoot.querySelector(`[data-row="${rowIndex}"][data-field="status"]`));
    if (statusCell) this.applyTone(statusCell, { name: 'status' }, this.flights[rowIndex]);

    this.displayedFlights[rowIndex] = newData;
  }

  /**
   * Cells are direct children of one grid rather than nested inside a row
   * element, so a cell is addressed by its row *and* field.
   *
   * @param {number} rowIndex
   * @param {string} fieldName
   * @param {string} oldText
   * @param {string} newText
   * @param {number} baseDelay
   */
  animateField(rowIndex, fieldName, oldText, newText, baseDelay) {
    const cell = this.shadowRoot.querySelector(
      `[data-row="${rowIndex}"][data-field="${fieldName}"]`);
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
    const timer = setTimeout(() => {
      element.classList.add('flipping');

      const inner = setTimeout(() => {
        element.textContent = newChar;
        element.classList.remove('flipping');
        this._timers.delete(inner);
      }, this.config.flip_duration / 2);
      this._timers.add(inner);
      this._timers.delete(timer);
    }, delay);
    this._timers.add(timer);
  }

  /** Pending flips would otherwise fire against a detached DOM. */
  clearTimers() {
    for (const timer of this._timers) clearTimeout(timer);
    this._timers.clear();
    clearInterval(this._clockTimer);
  }

  disconnectedCallback() {
    this.clearTimers();
  }

  connectedCallback() {
    // Re-entering the DOM after a dashboard tab switch: the clock would
    // otherwise stay frozen at the time it was removed.
    if (this.shadowRoot.querySelector('.clock')) this.startClock();
  }

  getTitle() {
    if (this.config.title) return this.config.title;
    if (!this._hass?.states[this.config.entity]) return this.t('flights');

    return this.t(this.getDirection() === 'departures' ? 'departures' : 'arrivals');
  }

  /** Column order and the character width each field is padded to. */
  getColumns() {
    const vf = this.config.visible_fields || {};
    const departures = this.getDirection() === 'departures';
    const columns = [];

    if (vf.time !== false) columns.push({ name: 'time', label: 'time', width: 5 });
    if (vf.expected !== false) columns.push({ name: 'expected', label: 'expected', width: 5 });
    if (vf.flight !== false) columns.push({ name: 'flight', label: 'flight', width: 8 });
    if (vf.airport !== false) columns.push({ name: 'airport', label: departures ? 'to' : 'from', width: 15 });
    if (vf.status !== false) columns.push({ name: 'status', label: 'status', width: 12 });
    if (vf.aircraft !== false) columns.push({ name: 'aircraft', label: 'aircraft', width: 14 });

    return columns;
  }

  renderFlightBoard() {
    const grid = this.shadowRoot.querySelector('.grid');
    const empty = /** @type {HTMLElement | null} */ (this.shadowRoot.querySelector('.empty'));
    if (!grid) return;

    // Header cells live in the same grid as the data, so the two can never
    // drift apart: there is one set of column tracks and one scroll container.
    grid.querySelectorAll('.cell').forEach(cell => cell.remove());

    if (this.displayedFlights.length === 0) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    const columns = this.getColumns();
    const fragment = document.createDocumentFragment();

    this.displayedFlights.forEach((flight, rowIndex) => {
      columns.forEach(column => {
        fragment.appendChild(this.createCell(flight, column, rowIndex));
      });
    });

    grid.appendChild(fragment);
  }

  /**
   * @param {Record<string, string>} flight
   * @param {{name: string, width: number}} column
   * @param {number} rowIndex
   */
  createCell(flight, column, rowIndex) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = String(rowIndex);
    cell.dataset.field = column.name;
    if (rowIndex % 2 === 1) cell.classList.add('odd');

    // Padded to a fixed character count, so every position is a tile and the
    // board keeps the mechanical grid look even where a value is short.
    const text = (flight[column.name] || '').padEnd(column.width, ' ');

    // The airline prefix of a flight number is picked out, the way boards
    // separate carrier from number.
    const source = this.flights[rowIndex];
    const prefix = column.name === 'flight' && source?.airline_iata
      ? String(source.airline_iata).length
      : 0;

    text.split('').forEach((char, index) => {
      const tile = document.createElement('span');
      tile.className = 'flap-char';
      if (char === ' ') tile.classList.add('blank');
      if (index < prefix) tile.classList.add('carrier');
      tile.textContent = char;
      cell.appendChild(tile);
    });

    this.applyTone(cell, column, source);
    return cell;
  }

  /**
   * Colour is applied to the cell rather than baked into the text, so an
   * animated update can refresh it without rebuilding the row.
   *
   * @param {HTMLElement} cell
   * @param {{name: string}} column
   * @param {Record<string, any> | undefined} flight
   */
  applyTone(cell, column, flight) {
    if (column.name !== 'status' || !flight) return;

    cell.classList.remove('tone-alert', 'tone-ok', 'tone-done', 'tone-neutral');
    cell.classList.add(`tone-${this.getFlightState(flight).tone}`);
  }

  render() {
    const columns = this.getColumns();

    // Remembered so `set hass` can tell when the chrome actually has to be
    // rebuilt. Without this every state update would re-render the whole
    // board, which also means no row would ever animate.
    this._renderedDirection = this.getDirection();
    this._renderedWithHass = !!this._hass;

    // Tile size is derived from how many characters actually have to fit, so
    // the board shrinks to the card instead of overflowing at a fixed size.
    // Below the floor it scrolls — at some width there is no honest way to
    // show 50-odd characters per row.
    const totalChars = columns.reduce((sum, column) => sum + column.width, 0);
    const chrome = columns.length * 20 + totalChars * 2;
    const tileWidth =
      `clamp(8px, calc((100cqw - ${chrome}px) / ${totalChars}), 14px)`;

    this.shadowRoot.innerHTML = `
      <style>
        /* Dark is the default: an airport board is a dark object.
           Light overrides only the tokens, never the rules below. */
        :host {
          display: block;
          container-type: inline-size;

          --fr24-frame-bg: #101216;
          --fr24-board-bg: #17191e;
          --fr24-row-bg: #1c1f25;
          --fr24-row-alt-bg: #191c21;
          --fr24-tile-top: #33373f;
          --fr24-tile-bottom: #23262c;
          --fr24-tile-fg: #f4f5f7;
          --fr24-blank-top: #212429;
          --fr24-blank-bottom: #1a1d22;
          --fr24-accent: #ffa500;
          --fr24-muted: #8b929e;
          --fr24-tone-alert: #ff6b5e;
          --fr24-tone-ok: #58c98a;
          --fr24-tone-done: #8b929e;
          --fr24-divider: rgba(255, 255, 255, 0.07);
          --fr24-seam: rgba(0, 0, 0, 0.55);
          --fr24-highlight: rgba(255, 255, 255, 0.10);

          --fr24-tile-w: ${tileWidth};
          --fr24-tile-h: calc(var(--fr24-tile-w) * 2.15);
          --fr24-tile-font: calc(var(--fr24-tile-w) * 1.25);

          /* Both masthead side slots share this width, wide enough for the
             clock (the larger of the two) — see the .masthead comment. */
          --fr24-side-w: clamp(40px, 5.8cqi, 60px);
        }

        :host([data-theme="light"]) {
          --fr24-frame-bg: #dfe2e8;
          --fr24-board-bg: #eceef2;
          --fr24-row-bg: #f6f7f9;
          --fr24-row-alt-bg: #eef0f4;
          --fr24-tile-top: #ffffff;
          --fr24-tile-bottom: #dcdfe6;
          --fr24-tile-fg: #14161a;
          /* Only just distinguishable from a filled tile: on a light board a
             stronger contrast makes trailing blanks read as a progress bar. */
          --fr24-blank-top: #f2f4f7;
          --fr24-blank-bottom: #e6e9ee;
          --fr24-accent: #b45309;
          --fr24-muted: #5b6472;
          /* Darkened against the light tiles so the contrast still carries. */
          --fr24-tone-alert: #b3261e;
          --fr24-tone-ok: #146c43;
          --fr24-tone-done: #5b6472;
          --fr24-divider: rgba(0, 0, 0, 0.08);
          --fr24-seam: rgba(0, 0, 0, 0.18);
          --fr24-highlight: rgba(255, 255, 255, 0.75);
        }

        .frame {
          background: var(--fr24-frame-bg);
          border-radius: 12px;
          overflow: hidden;
          font-family: 'Courier New', ui-monospace, monospace;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
        }

        /* The accent rail both reference boards carry along the board edge. */
        .rail {
          height: 4px;
          background: linear-gradient(
            90deg,
            var(--fr24-accent) 0%,
            var(--fr24-accent) 45%,
            color-mix(in srgb, var(--fr24-accent) 45%, transparent) 100%
          );
        }

        /* Icon and clock used to sit in "auto"-sized tracks, which only
           center the title correctly if both happen to render the same
           width — they don't (icon ~24px, clock ~68px), so the title sat
           ~22px left of true center. Both now share one fixed track width
           instead, wide enough for the clock; the icon centers within it. */
        .masthead {
          display: grid;
          grid-template-columns: var(--fr24-side-w) 1fr var(--fr24-side-w);
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
        }

        .icon {
          width: clamp(18px, 3.4cqi, 24px);
          height: clamp(18px, 3.4cqi, 24px);
          fill: var(--fr24-accent);
          justify-self: center;
        }

        .title {
          text-align: center;
          color: var(--fr24-accent);
          font-size: clamp(15px, 3.4cqi, 21px);
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .clock {
          justify-self: center;
          color: var(--fr24-accent);
          font-size: clamp(15px, 3.2cqi, 20px);
          font-weight: 700;
          letter-spacing: 0.08em;
          font-variant-numeric: tabular-nums;
        }

        /* One scroll container around header *and* rows. Column tracks are
           defined once on .grid, so labels cannot drift from their data. */
        .scroller {
          overflow-x: auto;
          background: var(--fr24-board-bg);
          scrollbar-width: thin;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(${columns.length}, max-content);
          min-width: max-content;
          align-items: center;
        }

        .colhead {
          position: sticky;
          top: 0;
          padding: 9px 10px;
          color: var(--fr24-muted);
          background: var(--fr24-frame-bg);
          border-bottom: 1px solid var(--fr24-divider);
          font-size: clamp(9px, 1.7cqi, 11px);
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .cell {
          display: flex;
          gap: 2px;
          padding: 5px 10px;
          background: var(--fr24-row-bg);
          border-bottom: 1px solid var(--fr24-divider);
        }

        .cell.odd { background: var(--fr24-row-alt-bg); }

        .flap-char {
          width: var(--fr24-tile-w);
          height: var(--fr24-tile-h);
          line-height: var(--fr24-tile-h);
          flex: 0 0 auto;
          text-align: center;
          font-size: var(--fr24-tile-font);
          font-weight: 700;
          color: var(--fr24-tile-fg);
          background: linear-gradient(
            180deg,
            var(--fr24-tile-top) 0%,
            var(--fr24-tile-bottom) 49%,
            var(--fr24-tile-top) 51%,
            var(--fr24-tile-bottom) 100%
          );
          border-radius: 2px;
          box-shadow:
            inset 0 1px 0 var(--fr24-highlight),
            0 1px 1px rgba(0, 0, 0, 0.25);
          position: relative;
          white-space: pre;
        }

        /* Tone marks the state; the word itself still says what it is, so
           the meaning does not depend on distinguishing the colours. */
        .cell.tone-alert .flap-char:not(.blank) { color: var(--fr24-tone-alert); }
        .cell.tone-ok .flap-char:not(.blank) { color: var(--fr24-tone-ok); }
        .cell.tone-done .flap-char:not(.blank) { color: var(--fr24-tone-done); }

        .flap-char.carrier { color: var(--fr24-accent); }

        /* Unused positions stay part of the board instead of leaving a hole. */
        .flap-char.blank {
          background: linear-gradient(
            180deg,
            var(--fr24-blank-top) 0%,
            var(--fr24-blank-bottom) 49%,
            var(--fr24-blank-top) 51%,
            var(--fr24-blank-bottom) 100%
          );
          box-shadow: inset 0 1px 0 var(--fr24-highlight);
        }

        /* The split seam every flap has across its middle. */
        .flap-char::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background: var(--fr24-seam);
        }

        .flap-char.flipping {
          animation: flip ${this.config.flip_duration}ms ease-in-out;
        }

        @keyframes flip {
          0%   { transform: scaleY(1); }
          25%  { transform: scaleY(0.75); filter: brightness(1.25); }
          50%  { transform: scaleY(0.06); filter: brightness(1.5); }
          75%  { transform: scaleY(0.75); filter: brightness(1.25); }
          100% { transform: scaleY(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .flap-char.flipping { animation: none; }
        }

        .empty {
          padding: 32px 16px;
          text-align: center;
          color: var(--fr24-muted);
          background: var(--fr24-board-bg);
          letter-spacing: 0.08em;
        }
      </style>

      <div class="frame">
        <div class="rail"></div>
        <div class="masthead">
          ${this.directionIcon()}
          <div class="title">${this.escape(this.getTitle())}</div>
          <div class="clock" aria-hidden="true"></div>
        </div>
        <div class="scroller">
          <div class="grid">
            ${columns.map(column =>
              `<div class="colhead">${this.escape(this.t(column.label))}</div>`).join('')}
          </div>
        </div>
        <div class="empty" hidden>${this.escape(this.t('noFlights'))}</div>
        <div class="rail"></div>
      </div>
    `;

    this.applyTheme();
    this.renderFlightBoard();
    this.startClock();
  }

  /**
   * Take-off and landing marks, matching the icons the integration gives
   * the two sensors. Inline because the card ships no icon font and must
   * not fetch anything to render its own chrome.
   *
   * @returns {string}
   */
  directionIcon() {
    const departures = this.getDirection() === 'departures';
    const path = departures
      ? 'M2.5 19h19v2h-19v-2zm19.57-9.36a1.5 1.5 0 0 0-1.84-1.06l-5.31 1.42-6.9-6.44-1.93.52 4.14 7.17-4.97 1.33-1.97-1.54-1.45.39 2.59 4.48 17.58-4.71a1.5 1.5 0 0 0 1.06-1.84z'
      : 'M2.5 19h19v2h-19v-2zm16.84-3.15a1.5 1.5 0 0 0 1.84-1.06 1.5 1.5 0 0 0-1.06-1.84l-5.31-1.42-2.76-9.14-1.93-.52v8.28l-4.97-1.33-.93-2.32-1.45-.39v5.17l16.57 4.57z';

    return `<svg class="icon" viewBox="0 0 24 24" role="img" aria-label="${
      this.escape(this.t(departures ? 'departures' : 'arrivals'))}"><path d="${path}"/></svg>`;
  }

  /**
   * A board without a clock leaves the times without a reference point.
   * Ticks on the minute rather than every second, since nothing on the
   * board resolves finer than that.
   */
  startClock() {
    clearInterval(this._clockTimer);

    const clock = /** @type {HTMLElement | null} */ (this.shadowRoot.querySelector('.clock'));
    if (!clock) return;

    const tick = () => {
      clock.textContent = this.formatTime(new Date());
    };

    tick();
    this._clockTimer = setInterval(tick, 15000);
  }

  /**
   * The title is user-supplied config and entity data, so it must not be
   * able to inject markup into the template above.
   *
   * @param {string} value
   * @returns {string}
   */
  escape(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
  }

  /**
   * `auto` follows Home Assistant's own dark-mode flag rather than the OS
   * setting, so the card matches the dashboard around it.
   */
  applyTheme() {
    const configured = this.config.theme;
    const dark = configured === 'dark' ? true
      : configured === 'light' ? false
      : this._hass?.themes?.darkMode !== false;

    this.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  /**
   * `getCardSize()`/`getLayoutOptions()` are how a card tells Home Assistant
   * how tall it actually is, so Masonry/Sections can size the space around
   * it instead of leaving a gap or clipping it. Both used to return fixed
   * numbers regardless of `max_flights`, `title`, or how many
   * `visible_fields` are shown — this estimates instead: masthead + column
   * header (2 rows) plus one row per flight, converted from this card's own
   * ~36px row height to HA's ~50px size unit.
   *
   * Approximate by nature — HA's own docs call this a "good faith
   * estimate" — and not verified against a live HA frontend, only against
   * the numbers this card itself renders at. Static so both the instance
   * method below and its config-less fallback can share one formula
   * instead of the two drifting apart.
   *
   * @param {number} maxFlights
   * @returns {number}
   */
  static estimateRowUnits(maxFlights) {
    return Math.max(1, Math.ceil(((2 + maxFlights) * 36) / 50));
  }

  getCardSize() {
    return FlightRadar24SplitFlapCard.estimateRowUnits(this.config?.max_flights || 8);
  }

  /**
   * Instance method: Home Assistant prefers this over the static one below
   * once the card is actually configured, which is what makes a dynamic
   * (config-dependent) result possible at all — the static version has no
   * instance to read `max_flights` from.
   *
   * @returns {Record<string, number>}
   */
  getLayoutOptions() {
    return {
      ...FlightRadar24SplitFlapCard.getLayoutOptions(),
      grid_rows: FlightRadar24SplitFlapCard.estimateRowUnits(this.config?.max_flights || 8)
    };
  }

  /**
   * Static fallback: what the card picker shows before any configuration
   * exists, so there's nothing dynamic to base it on yet — `getStubConfig`'s
   * default `max_flights: 8` is the closest available estimate.
   */
  static getLayoutOptions() {
    return {
      grid_rows: FlightRadar24SplitFlapCard.estimateRowUnits(8),
      grid_columns: 12,
      grid_min_rows: 3,
      grid_max_rows: 16,
      grid_min_columns: 6
    };
  }

  static getStubConfig() {
    return {
      entity: '',
      max_flights: 8,
      board: 'auto',
      theme: 'auto',
      visible_fields: {
        time: true,
        expected: true,
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
      theme: 'auto',
      visible_fields: {
        time: true,
        expected: true,
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
          <label for="theme">${this.t('editor.theme')}</label>
          <select id="theme">
            <option value="auto" ${config.theme !== 'dark' && config.theme !== 'light' ? 'selected' : ''}>${this.t('editor.themeAuto')}</option>
            <option value="dark" ${config.theme === 'dark' ? 'selected' : ''}>${this.t('editor.themeDark')}</option>
            <option value="light" ${config.theme === 'light' ? 'selected' : ''}>${this.t('editor.themeLight')}</option>
          </select>
          <div class="helper">${this.t('editor.themeHelper')}</div>
        </div>

        <div class="config-row">
          <label>${this.t('editor.visibleFields')}</label>
          <div class="checkbox-group">
            <div class="checkbox-item">
              <input type="checkbox" id="show_time" ${vf.time !== false ? 'checked' : ''}>
              <label for="show_time">${this.t('editor.fieldTime')}</label>
            </div>
            <div class="checkbox-item">
              <input type="checkbox" id="show_expected" ${vf.expected !== false ? 'checked' : ''}>
              <label for="show_expected">${this.t('editor.fieldExpected')}</label>
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
    this.shadowRoot.getElementById('theme')?.addEventListener('change', () => this.valueChanged());

    this.shadowRoot.getElementById('show_time')?.addEventListener('change', () => this.valueChanged());
    this.shadowRoot.getElementById('show_expected')?.addEventListener('change', () => this.valueChanged());
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
      theme: this.getSelect('theme')?.value || 'auto',
      visible_fields: {
        time: this.getInput('show_time')?.checked !== false,
        expected: this.getInput('show_expected')?.checked !== false,
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
