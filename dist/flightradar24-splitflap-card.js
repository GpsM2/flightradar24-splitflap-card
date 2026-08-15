/**
 * Version of record for this card, logged on load so a user reporting an
 * issue can read the installed version straight out of the browser console
 * (HACS caching makes "latest" an unreliable assumption).
 *
 * Kept in sync with the release tag; see CLAUDE.md.
 */
const CARD_VERSION = '0.6.0-beta.1';

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

/**
 * The board's own typeface, subset to the characters it can render (~3 KB of
 * the 95 KB original) and served from this repo — never from a third party,
 * so no dashboard makes an outbound request just to draw a flight board.
 *
 * Registered on the document rather than inside the shadow root: `@font-face`
 * is document-scoped, and shadow-tree font rules are not reliably honoured.
 * The URL is resolved from `import.meta.url`, like `translations/`, because
 * CSS inside a shadow root resolves relative URLs against the *page*, not
 * the module.
 */
const BOARD_FONT_FAMILY = 'JetBrains Mono';

function registerBoardFont() {
  const id = 'flightradar24-splitflap-card-font';
  if (document.getElementById(id)) return;

  const url = new URL('fonts/JetBrainsMono-Bold-subset.woff2', import.meta.url).href;
  const style = document.createElement('style');
  style.id = id;
  style.textContent = `@font-face{font-family:'${BOARD_FONT_FAMILY}';`
    + `src:url('${url}') format('woff2');`
    + 'font-weight:700;font-style:normal;font-display:swap;}';
  document.head.appendChild(style);
}

/**
 * The order of flaps on the wheel. A physical wheel turns one way only, so
 * the scramble animation walks this sequence forwards and wraps around
 * rather than reversing. Blank first, as on a real board, then digits and
 * letters — the punctuation the board actually prints comes last.
 */
const FLAP_SEQUENCE = ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ-:+./';

/**
 * Upper bound on intermediate characters shown per flap. Without it a flap
 * crossing most of the alphabet would still be turning long after its
 * neighbours had settled.
 */
const MAX_SCRAMBLE_STEPS = 12;

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
    "editor.accentColor": "Accent colour",
    "editor.accentColorHelper": "Leave empty to follow the selected appearance",
    "editor.board": "Board direction",
    "editor.boardArrivals": "Arrivals",
    "editor.boardAuto": "Auto-detect",
    "editor.boardDepartures": "Departures",
    "editor.boardHelper": "Detected from the sensor. Override only if the airport column is labelled wrong.",
    "editor.entity": "Entity",
    "editor.entityHelper": "Select a FlightRadar24 arrivals or departures sensor",
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
    "editor.flipStyle": "Flip animation",
    "editor.flipStyleFlip": "Flip",
    "editor.flipStyleHelper": "How a flap changes to its new character",
    "editor.flipStyleScramble": "Roll through characters",
    "editor.language": "Language",
    "editor.languageAuto": "Automatic",
    "editor.languageHelper": "Leave on automatic to follow Home Assistant",
    "editor.loading": "Loading…",
    "editor.maxFlights": "Maximum flights",
    "editor.maxFlightsHelper": "Number of rows to display (1-20)",
    "editor.rail": "Edge bars",
    "editor.railAccent": "Accent, fading",
    "editor.railHelper": "The coloured bars along the top and bottom of the board",
    "editor.railNone": "None",
    "editor.railRainbow": "Rainbow",
    "editor.railSolid": "Accent, solid",
    "editor.theme": "Appearance",
    "editor.themeAuto": "Follow Home Assistant",
    "editor.themeDark": "Dark",
    "editor.themeHelper": "Follows the Home Assistant theme unless overridden",
    "editor.themeLight": "Light",
    "editor.title": "Title",
    "editor.titleHelper": "Leave empty to use the board direction",
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
    registerBoardFont();
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
      accent_color: config.accent_color || '',
      rail_style: config.rail_style || 'accent',
      flip_style: config.flip_style === 'scramble' ? 'scramble' : 'flip',
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
    if (vf.flight !== false) fields.flight = this.fit(flight.flight_number || flight.callsign, 8);
    if (vf.airport !== false) fields.airport = this.fit(flight.airport_city || flight.airport_code_iata, 15);
    if (vf.status !== false) fields.status = this.fit(this.formatStatus(flight), 12);
    if (vf.aircraft !== false) {
      fields.aircraft = this.fit(this.truncateAtWord(flight.aircraft_model || '', 14), 14);
    }

    return fields;
  }

  /**
   * A real board only carries uppercase flaps, but the integration's values
   * are mixed case ("Hamburg", "Airbus A320"), so the board has to do the
   * conversion itself.
   *
   * Uppercasing happens before the fixed width is applied: in German `ß`
   * becomes `SS`, which is one character longer and would otherwise push
   * every following tile out of its column. Locale-aware, since the same
   * character maps differently per language.
   *
   * @param {string | undefined | null} value
   * @param {number} width
   * @returns {string}
   */
  fit(value, width) {
    const upper = String(value || '').toLocaleUpperCase(this.resolveLanguage());
    return upper.substring(0, width).padEnd(width, ' ');
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

  /**
   * Puts a character on a flap and keeps the `blank` flag in step. That flag
   * drives both the empty-flap styling and whether the status tone applies,
   * so it has to follow the character rather than stay at whatever
   * createCell() first saw.
   *
   * @param {HTMLElement} element
   * @param {string} char
   */
  setFlapChar(element, char) {
    element.textContent = char;
    element.classList.toggle('blank', char === ' ');
  }

  flipCharacter(element, oldChar, newChar, delay) {
    if (this.config.flip_style === 'scramble') {
      this.scrambleCharacter(element, oldChar, newChar, delay);
      return;
    }

    const timer = setTimeout(() => {
      element.classList.add('flipping');

      const inner = setTimeout(() => {
        this.setFlapChar(element, newChar);
        element.classList.remove('flipping');
        this._timers.delete(inner);
      }, this.config.flip_duration / 2);
      this._timers.add(inner);
      this._timers.delete(timer);
    }, delay);
    this._timers.add(timer);
  }

  /**
   * Steps through the wheel's own character sequence from the old character
   * to the new one, forwards only — a real split-flap wheel cannot run
   * backwards, so `Z -> B` wraps around rather than reversing.
   *
   * The number of steps is capped: crossing most of the alphabet would
   * otherwise take far longer than `flip_duration`, and a board where some
   * flaps are still spinning long after the rest have settled reads as
   * broken rather than mechanical. Long journeys therefore sample the
   * sequence instead of showing every position.
   *
   * @param {HTMLElement} element
   * @param {string} oldChar
   * @param {string} newChar
   * @param {number} delay
   */
  scrambleCharacter(element, oldChar, newChar, delay) {
    const sequence = FLAP_SEQUENCE;
    const from = sequence.indexOf(oldChar);
    const to = sequence.indexOf(newChar);

    // A character the wheel doesn't carry can't be stepped to; fall back to
    // simply setting it once the flap would have finished turning.
    if (from < 0 || to < 0) {
      const timer = setTimeout(() => {
        this.setFlapChar(element, newChar);
        this._timers.delete(timer);
      }, delay + this.config.flip_duration / 2);
      this._timers.add(timer);
      return;
    }

    const distance = (to - from + sequence.length) % sequence.length;
    const steps = Math.min(distance, MAX_SCRAMBLE_STEPS);
    const stepDuration = this.config.flip_duration / Math.max(steps, 1);

    for (let step = 1; step <= steps; step++) {
      // Sampled so the last step always lands exactly on the target.
      const index = step === steps
        ? to
        : (from + Math.round((distance * step) / steps)) % sequence.length;

      const timer = setTimeout(() => {
        this.setFlapChar(element, sequence[index]);
        this._timers.delete(timer);
      }, delay + step * stepDuration);
      this._timers.add(timer);
    }
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

      // Carries the row background across the trailing 1fr track, so the
      // striping reaches the card edge even with columns hidden.
      const filler = document.createElement('div');
      filler.className = rowIndex % 2 === 1 ? 'cell filler odd' : 'cell filler';
      filler.dataset.row = String(rowIndex);
      fragment.appendChild(filler);
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
          --fr24-accent: #ffa500;
          --fr24-muted: #8b929e;
          --fr24-tone-alert: #ff6b5e;
          --fr24-tone-ok: #58c98a;
          --fr24-tone-done: #8b929e;
          --fr24-divider: rgba(255, 255, 255, 0.07);
          --fr24-seam: rgba(0, 0, 0, 0.55);
          --fr24-highlight: rgba(255, 255, 255, 0.10);

          --fr24-tile-w: ${tileWidth};
          /* Sized from the board font's actual metrics (cap height 0.73em,
             advance 0.60em), not by eye. At these ratios a capital fills
             ~61% of the flap's height and ~78% of its width. The previous
             2.15 aspect left the character at ~34% of the height, which is
             what made the flaps look oversized and the text adrift. */
          --fr24-tile-h: calc(var(--fr24-tile-w) * 1.55);
          --fr24-tile-font: calc(var(--fr24-tile-w) * 1.3);

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
          /* Monospace is structural, not stylistic: every character gets
             its own fixed-width flap, so a proportional fallback would
             break the columns outright. */
          font-family: '${BOARD_FONT_FAMILY}', ui-monospace, monospace;
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

        /* A solid bar in the accent colour, without the fade. */
        :host([data-rail="solid"]) .rail {
          background: var(--fr24-accent);
        }

        /* The multicoloured edge some split-flap boards carry. Fixed hues
           rather than theme tokens: the point of this option is the stripe
           itself, and deriving it from the accent would collapse it. */
        :host([data-rail="rainbow"]) .rail {
          background: linear-gradient(
            90deg,
            #e8572a, #f5a623, #7ed321, #4a90d9, #bd10e0
          );
        }

        :host([data-rail="none"]) .rail {
          display: none;
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

        /* Trailing 1fr track: the data columns are max-content, so with a
           column hidden they no longer reach the card's edge and the row
           striping used to stop mid-card. The filler cell carries the same
           background so each row runs to the edge whatever is shown. */
        .grid {
          display: grid;
          grid-template-columns: repeat(${columns.length}, max-content) 1fr;
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

        /* The grid centres its items, so the filler would only be as tall
           as its own padding and its background would stop short of the
           row. Stretch it instead, and give it no padding of its own. */
        .cell.filler,
        .colhead.filler {
          padding: 0;
          align-self: stretch;
        }

        .flap-char {
          width: var(--fr24-tile-w);
          height: var(--fr24-tile-h);
          flex: 0 0 auto;
          /* Centring the line box is not enough: it is sized from the
             font's ascent and descent, but the board only ever renders
             uppercase, digits and punctuation, which use none of the
             descent, so the ink lands above the flap's middle — and above
             the seam, which should bisect the character.

             The value follows from the board font's own metrics (ascent
             1.02em, descent 0.30em, cap 0.73em → ink sits 0.005em high;
             padding is halved by the centring, hence twice that). It is
             font-specific: Courier New, the previous face, needed roughly
             five times as much. */
          box-sizing: border-box;
          padding-top: 0.01em;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
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

        /* A blank flap is the same physical flap with nothing printed on
           it, so it deliberately has no styling of its own — it is only
           distinguished by carrying no character, and by not taking the
           status colour. */

        /* The split seam every flap has across its middle. */
        /* The split runs through the character, not behind it: on a real
           flap the character is printed across two halves, so the seam
           crosses it. z-index lifts it above the glyph, which is ordinary
           inline content and would otherwise paint on top. */
        .flap-char::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 1px;
          background: var(--fr24-seam);
          z-index: 1;
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
            <div class="colhead filler"></div>
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
    this.setAttribute('data-rail', this.config.rail_style || 'accent');

    // An explicit accent overrides the theme's own token. Set on the host so
    // it cascades into every rule that already reads --fr24-accent, rather
    // than duplicating the colour at each use.
    const accent = this.toCssColour(this.config.accent_color);
    if (accent) {
      this.style.setProperty('--fr24-accent', accent);
    } else {
      this.style.removeProperty('--fr24-accent');
    }
  }

  /**
   * The editor's colour selector hands back `[r, g, b]`, while a hand-written
   * YAML config would carry a plain CSS string. Accept both rather than
   * forcing one of the two entry points to look wrong.
   *
   * @param {unknown} value
   * @returns {string}
   */
  toCssColour(value) {
    if (Array.isArray(value) && value.length === 3) return `rgb(${value.join(',')})`;
    return typeof value === 'string' ? value : '';
  }

  /**
   * Masonry view only — it has no equivalent of the grid's `rows: "auto"`,
   * so this one still has to estimate: masthead + column header (2 rows)
   * plus one row per flight, converted from this card's own ~36px row
   * height to the 50px unit `getCardSize` is defined in.
   *
   * Approximate by nature; HA's own docs call it a good-faith estimate.
   *
   * @returns {number}
   */
  getCardSize() {
    const rows = 2 + (this.config?.max_flights || 8);
    return Math.max(1, Math.ceil((rows * 36) / 50));
  }

  /**
   * Sections view. `rows: "auto"` makes Home Assistant measure what the
   * card actually renders instead of trusting arithmetic — the height
   * depends on `max_flights`, the masthead and the column header, and a
   * grid row (56px + 8px gap) is a different unit from `getCardSize`'s
   * 50px, so an estimate here would be wrong twice over.
   *
   * `getLayoutOptions` is deliberately not implemented alongside this:
   * it is deprecated in Home Assistant, and this card already requires
   * 2026.2.0, well past the point where `getGridOptions` exists.
   *
   * @returns {{rows: string, columns: string, min_columns: number}}
   */
  getGridOptions() {
    return {
      rows: 'auto',
      // A departure board is a wide table — full width by default, and
      // never squeezed below a third of the section, where the columns
      // would start scrolling immediately.
      columns: 'full',
      min_columns: 12
    };
  }

  static getStubConfig() {
    return {
      entity: '',
      max_flights: 8,
      board: 'auto',
      theme: 'auto',
      rail_style: 'accent',
      flip_style: 'flip',
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

/**
 * Home Assistant's `<ha-form>` frontend component. Untyped by HA itself, so
 * this covers only the surface this editor actually touches.
 *
 * @typedef {HTMLElement & {
 *   hass: unknown,
 *   data: Record<string, unknown>,
 *   schema: Array<Record<string, unknown>>,
 *   computeLabel?: (schema: Record<string, any>) => string,
 *   computeHelper?: (schema: Record<string, any>) => string,
 * }} HaFormElement
 */

class FlightRadar24SplitFlapCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    /** @type {Record<string, string>} */
    this._strings = FALLBACK_TRANSLATIONS;
    /** @type {HaFormElement | undefined} */
    this._form = undefined;
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
      // The language whose strings are actually in use, as opposed to the
      // one requested above — the schema signature keys off this, see
      // schemaSignature().
      this._activeLanguage = lang;
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
      accent_color: '',
      rail_style: 'accent',
      flip_style: 'flip',
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
    // Always: render() builds the form once and only refreshes its
    // properties afterwards, and `ha-form` needs a current `hass` for the
    // entity picker to work at all.
    this.render();
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

  /**
   * Field name -> translation key. Kept explicit rather than derived from
   * the name, so a schema rename can't silently fall back to showing the
   * raw key to the user.
   */
  static LABEL_KEYS = {
    entity: 'editor.entity',
    title: 'editor.title',
    language: 'editor.language',
    board: 'editor.board',
    theme: 'editor.theme',
    rail_style: 'editor.rail',
    accent_color: 'editor.accentColor',
    flip_style: 'editor.flipStyle',
    max_flights: 'editor.maxFlights',
    flip_duration: 'editor.flipDuration',
    flip_delay: 'editor.flipDelay',
    visible_fields: 'editor.visibleFields',
    time: 'editor.fieldTime',
    expected: 'editor.fieldExpected',
    flight: 'editor.fieldFlight',
    airport: 'editor.fieldAirport',
    status: 'editor.fieldStatus',
    aircraft: 'editor.fieldAircraft'
  };

  static HELPER_KEYS = {
    entity: 'editor.entityHelper',
    title: 'editor.titleHelper',
    language: 'editor.languageHelper',
    board: 'editor.boardHelper',
    theme: 'editor.themeHelper',
    rail_style: 'editor.railHelper',
    accent_color: 'editor.accentColorHelper',
    flip_style: 'editor.flipStyleHelper',
    max_flights: 'editor.maxFlightsHelper',
    flip_duration: 'editor.flipDurationHelper',
    flip_delay: 'editor.flipDelayHelper',
    visible_fields: 'editor.visibleFieldsHelper'
  };

  /**
   * Built per render rather than declared statically, because the entity
   * list has to be filtered against `hass` — that filtering is the reason
   * this card keeps `getConfigElement()` instead of moving to the static
   * `getConfigForm()`, which gets no `hass` at all (see #13).
   *
   * @returns {Array<Record<string, any>>}
   */
  buildSchema() {
    const select = (options) => ({
      selector: { select: { mode: 'dropdown', options } }
    });

    return [
      {
        name: 'entity',
        required: true,
        selector: {
          entity: {
            // Only real arrivals/departures boards, never the area sensors
            // or the statistics sub-sensors.
            include_entities: this.getFlightRadar24Entities().map(entity => entity.value)
          }
        }
      },
      { name: 'title', selector: { text: {} } },
      {
        name: 'language',
        ...select([
          { value: '', label: this.t('editor.languageAuto') },
          // Language names stay in their own language, as language pickers do.
          { value: 'en', label: 'English' },
          { value: 'de', label: 'Deutsch' },
          { value: 'es', label: 'Español' },
          { value: 'fr', label: 'Français' }
        ])
      },
      {
        name: 'board',
        ...select([
          { value: 'auto', label: this.t('editor.boardAuto') },
          { value: 'arrivals', label: this.t('editor.boardArrivals') },
          { value: 'departures', label: this.t('editor.boardDepartures') }
        ])
      },
      {
        name: 'theme',
        ...select([
          { value: 'auto', label: this.t('editor.themeAuto') },
          { value: 'dark', label: this.t('editor.themeDark') },
          { value: 'light', label: this.t('editor.themeLight') }
        ])
      },
      {
        name: 'rail_style',
        ...select([
          { value: 'accent', label: this.t('editor.railAccent') },
          { value: 'solid', label: this.t('editor.railSolid') },
          { value: 'rainbow', label: this.t('editor.railRainbow') },
          { value: 'none', label: this.t('editor.railNone') }
        ])
      },
      { name: 'accent_color', selector: { color_rgb: {} } },
      {
        name: 'flip_style',
        ...select([
          { value: 'flip', label: this.t('editor.flipStyleFlip') },
          { value: 'scramble', label: this.t('editor.flipStyleScramble') }
        ])
      },
      { name: 'max_flights', selector: { number: { min: 1, max: 20, mode: 'box' } } },
      { name: 'flip_duration', selector: { number: { min: 200, max: 2000, step: 100, mode: 'box' } } },
      { name: 'flip_delay', selector: { number: { min: 10, max: 200, step: 10, mode: 'box' } } },
      {
        name: 'visible_fields',
        type: 'expandable',
        schema: [
          { name: 'time', selector: { boolean: {} } },
          { name: 'expected', selector: { boolean: {} } },
          { name: 'flight', selector: { boolean: {} } },
          { name: 'airport', selector: { boolean: {} } },
          { name: 'status', selector: { boolean: {} } },
          { name: 'aircraft', selector: { boolean: {} } }
        ]
      }
    ];
  }

  /**
   * Schema identity drives whether `ha-form` rebuilds its fields, so it is
   * only recomputed when something it actually depends on changed —
   * otherwise every hass update would tear down the form mid-edit.
   *
   * Keyed on the language whose strings are *loaded*, not the one
   * requested: `computeLabel` is called lazily by `ha-form` and picks up
   * new translations on its own, but dropdown option labels are baked into
   * the schema when it is built. Keying off the requested language left
   * those options in English while every field label was translated.
   *
   * @returns {string}
   */
  schemaSignature() {
    return [
      this._activeLanguage,
      this.getFlightRadar24Entities().map(entity => entity.value).join(',')
    ].join('|');
  }

  render() {
    // Home Assistant gives no ordering guarantee between setConfig() and the
    // hass setter. If hass lands first, `_config` doesn't exist yet and
    // reading it threw a config error into the editor.
    if (!this._hass || !this._config) {
      this.shadowRoot.innerHTML =
        `<div style="padding: 16px;">${this.t('editor.loading')}</div>`;
      return;
    }

    if (!this._form) {
      this.shadowRoot.innerHTML = '<div class="card-config"></div>';
      const style = document.createElement('style');
      style.textContent = '.card-config { padding: 8px 0; }';
      this.shadowRoot.appendChild(style);

      // ha-form is a Home Assistant frontend component with no published
      // types, so TypeScript only sees a plain HTMLElement here — cast once
      // at creation rather than scattering `any` at every property below.
      const form = /** @type {HaFormElement} */ (document.createElement('ha-form'));
      this._form = form;
      form.computeLabel = schema =>
        this.t(FlightRadar24SplitFlapCardEditor.LABEL_KEYS[schema.name] || schema.name);
      form.computeHelper = schema => {
        const key = FlightRadar24SplitFlapCardEditor.HELPER_KEYS[schema.name];
        return key ? this.t(key) : '';
      };
      form.addEventListener('value-changed', event => {
        // ha-form hands back the whole merged object, including nested
        // visible_fields — no per-field wiring left to keep in sync.
        const detail = /** @type {CustomEvent} */ (event).detail;
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: { ...this._config, ...detail.value } },
          bubbles: true,
          composed: true
        }));
      });
      this.shadowRoot.querySelector('.card-config').appendChild(form);
    }

    const signature = this.schemaSignature();
    if (signature !== this._schemaSignature) {
      this._schemaSignature = signature;
      this._form.schema = this.buildSchema();
    }

    this._form.hass = this._hass;
    this._form.data = this._config;
  }

}

customElements.define('flightradar24-splitflap-card', FlightRadar24SplitFlapCard);
customElements.define('flightradar24-splitflap-card-editor', FlightRadar24SplitFlapCardEditor);

/**
 * Offers this card when someone picks a FlightRadar24 arrivals/departures
 * sensor in Home Assistant's entity-first "add card" flow (HA 2026.6+).
 *
 * Deliberately strict: returning a suggestion for an entity the board
 * can't render would put a broken card in front of the user. Reuses the
 * same `flights` + `status_text` test the editor's entity picker uses, so
 * area sensors and the statistics sub-sensors are never suggested.
 *
 * @param {{states: Record<string, any>}} hass
 * @param {string} entityId
 * @returns {{config: Record<string, string>} | null}
 */
function suggestFlightRadar24Card(hass, entityId) {
  if (!entityId.startsWith('sensor.')) return null;

  const flights = hass?.states?.[entityId]?.attributes?.flights;
  if (!Array.isArray(flights)) return null;

  // An empty board carries no marker to inspect, so fall back to the entity
  // ID — same reasoning as the editor's picker.
  const isAirportBoard = flights.length > 0
    ? flights[0].status_text !== undefined
    : /airport_(arrivals|departures)/.test(entityId);
  if (!isAirportBoard) return null;

  return { config: { type: 'custom:flightradar24-splitflap-card', entity: entityId } };
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'flightradar24-splitflap-card',
  name: 'FlightRadar24 Split-Flap Card',
  description: 'A split-flap airport display for FlightRadar24 flight data',
  preview: true,
  documentationURL: 'https://github.com/GpsM2/flightradar24-splitflap-card',
  getEntitySuggestion: suggestFlightRadar24Card
});
