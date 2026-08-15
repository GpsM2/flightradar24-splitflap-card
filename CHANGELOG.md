# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.6.0-beta.2] - 2026-08-15

### Fixed
- The fold line across each flap was barely visible in light mode. It was a
  flat translucent black line, which reads well against the dark theme's
  near-white text but almost disappears against the light theme's near-black
  text — black on black. Replaced with a two-band shadow/highlight groove so
  at least one band always contrasts against whatever colour it crosses.

## [0.6.0-beta.1] - 2026-08-15

### Changed
- The board now reads as a single physical object: printed and blank flaps are
  styled identically, the fold line runs through the character rather than
  behind it, and the flaps are considerably less tall — a capital letter now
  fills roughly two thirds of a flap's height instead of one third.
- Own typeface: JetBrains Mono Bold, sans-serif, served from this repository.
  No fonts are loaded from third parties.
- Every character on the board is rendered in uppercase.
- German board labels are now singular: `ANKUNFT` and `ABFLUG` instead of
  `ANKÜNFTE` and `ABFLÜGE`.
- Documentation switched to setting the card up through the interface. The YAML
  examples are gone — in particular the stack-card example, which caused Home
  Assistant to miscalculate the card's height so the section overflowed into
  the one below.
- All documentation in this repository is now written in English.

### Added
- Selectable edge bars: accent colour fading or solid, rainbow, or off.
- Custom accent colour.
- A second animation style: flaps can roll through the characters up to the
  target instead of flipping straight to it.

## [0.5.0] - 2026-08-15

Promoted from 0.5.0-beta.2 after maintainer testing, no code changes. See the
beta entries below for what's actually in this release.

## [0.5.0-beta.2] - 2026-08-15

### Fixed
- Individual characters kept the wrong colour after an update (in both light
  and dark mode). The marker for blank flaps wasn't carried over when a flap
  turned, so tiles showing letters still counted as blank — and were therefore
  neither coloured nor given the right background.
- With a column hidden, the board stopped in the middle of the card instead of
  at its edge. Rows now run to the card's edge regardless of how many columns
  are shown.
- Characters sat slightly too high on the flaps, and so above the fold line
  that should run through the middle of the character.

## [0.5.0-beta.1] - 2026-08-14

### Fixed
- The configuration editor crashed with "Cannot read properties of undefined
  (reading 'visible_fields')" when Home Assistant supplied the entity data
  before the configuration. The bug had been present since at least 0.3.
- The card size was reported through `getLayoutOptions()`, which is marked
  deprecated in Home Assistant, and calculated from a pixel estimate.
  `getGridOptions()` with `rows: "auto"` is used instead — Home Assistant
  measures the card's actual height rather than relying on a conversion.

### Changed
- The configuration editor now uses Home Assistant's own form component instead
  of a hand-built form: native appearance, a real entity search and less code
  of our own. The filtering to arrivals/departures sensors is preserved.

### Added
- The card offers itself in Home Assistant's entity picker when adding a card,
  once an arrivals or departures sensor is selected (Home Assistant 2026.6+).

## [0.4.1] - 2026-08-14

Promoted from 0.4.1-beta.1 after maintainer testing, no code changes. See that
entry below for what's actually in this release.

## [0.4.1-beta.1] - 2026-08-14

### Fixed
- `getCardSize()`/`getLayoutOptions()` returned fixed values regardless of
  `max_flights`. Home Assistant could therefore not size the reserved area
  (in Masonry or Sections view) to the card. Both are now derived from
  `max_flights`.
- The aircraft type was cut off hard at 12 characters — affecting 28 of 29 real
  models in production data, usually leaving a dangling hyphen (`Airbus A320-`).
  The column is now 14 characters wide and cuts at the last word or hyphen
  boundary.
- The masthead title sat 22 px left of centre because the icon and clock tracks
  had different widths. Both now share one width.

## [0.4.0] - 2026-08-14

Promoted from 0.4.0-beta.1 after maintainer testing, no code changes. See that
entry below for what's actually in this release.

## [0.4.0-beta.1] - 2026-08-14

### Added
- Delay indicator: the expected time is now shown next to the scheduled one
  whenever it differs. The status column shows the deviation in minutes
  (`+8 MIN`, `-12 MIN`) or `ON TIME`, `LANDED`, `CANCELLED`.
- Colour-coded status: delays and cancellations red, on-time flights green. The
  colour supplements the text rather than replacing it.
- Clock and a direction mark (take-off/landing) in the board's masthead.
- The airline prefix of the flight number is picked out in the accent colour.
- Cancelled flights show dashes instead of a time.

### Fixed
- Columns ran out of the grid on narrow cards and the headings no longer matched
  the data. The header row and the rows were two separate scroll containers;
  when scrolled, a column could sit up to 150 px away from its heading. Both now
  live in one shared grid.
- The "No flights available" message never appeared — with an empty flight list,
  an unavailable or a missing entity the board simply stayed blank.
- Running flip animations were not stopped when the card was removed.

### Added
- Light and dark mode. Without an explicit setting the card follows the Home
  Assistant theme; `theme: dark` or `theme: light` overrides it.
- The board is now responsive: flap size follows how many characters actually
  have to fit. Only below a minimum size does it scroll horizontally.

### Changed
- New board design: a continuous flap grid in which unused positions stay
  visible as blank flaps, with accent bars along the top and bottom edges.

## [0.3.0] - 2026-08-14

Promoted from 0.3.0-beta.1 after maintainer testing, no code changes. See that
entry below for what's actually in this release.

## [0.3.0-beta.1] - 2026-08-14

### Added
- All text now lives in `dist/translations/<language>.json` and is loaded at
  runtime. This includes the configuration editor, which had been English
  throughout. Adding a language therefore no longer requires a JavaScript
  change.
- Without a `language` option the card follows the Home Assistant language
  (`hass.locale.language`) instead of defaulting to English.

### Fixed
- Times were rendered as `07:50 AM` in the English locale and overflowed the
  time column. Boards now use the 24-hour format everywhere.
- The status was cut off mid-word and always stayed English: "Estimated dep
  07:40" became "Estimated de". The card now reads the machine-readable
  `status` field and shows the translated status (`EXPECTED`, `SCHEDULED`,
  `CANCELLED`, `LANDED`, `DEPARTED`, `DELAYED`, `DIVERTED`). Unknown statuses
  fall back to the original text, cut at a word boundary.
- On a departures board the `FROM` column was filled with the flight's
  *destination*. The card now detects the sensor's direction and labels the
  column `FROM` (arrivals) or `TO` (departures) accordingly.
- On a departures board the time column showed the scheduled *arrival* at the
  destination airport rather than the departure. Example: a flight with
  "Estimated dep 07:40" was displayed as `10:55`.
- The automatic title stayed generic (`FLIGHTS`) instead of switching to
  `ARRIVALS` or `DEPARTURES` once the entity became available.

### Added
- Configuration option `board` (`auto`/`arrivals`/`departures`). The direction
  is normally detected automatically; the option is only needed if the sensor's
  icon has been overridden.

### Changed
- The shipped files now live in the `dist/` folder. Nothing changes for a HACS
  installation. For a manual installation the whole `dist` content must be
  copied, and the resource URL is now
  `/local/flightradar24-splitflap-card/flightradar24-splitflap-card.js`.
- `visible_fields.from` and `visible_fields.to` are merged into a single
  `visible_fields.airport` column. A flight only ever names the other airport —
  its own is never in the data — so the second column could never be filled.
  Existing configs with `from: false` still hide the column.

### Removed
- Support for the area sensors (`current_in_area`, `entered_area`,
  `exited_area`, `additional_tracked`). This card is purely an
  arrivals/departures board and now works only with
  `sensor.flightradar24_airport_arrivals` / `_departures`. The integration's
  sensors themselves are unaffected and remain usable elsewhere.
- Configuration option `mode` (`auto`/`airport`/`area`) — with no second sensor
  type there is nothing left to distinguish.
- Configuration options `visible_fields.altitude` and `visible_fields.speed` —
  the airport sensors don't provide those values, so the columns always stayed
  empty.

### Changed
- The entity picker in the visual editor now lists only sensors with a
  `flights` attribute, so no statistics sensors such as `..._delayed` or
  `..._on_time`.

## [0.2.0] - 2026-02-06

### Added
- Support for the new airport arrivals/departures sensors
- Automatic detection of the sensor type (airport vs. area)
- New `mode` option for selecting the sensor type manually
- Better handling of `status_text` from airport sensors
- Support for the `airport_city` field
- MIGRATION.md for switching from the Markdown card

### Changed
- Improved auto-detection between airport and area sensors
- Data formatting optimised per sensor type

## [0.1.0] - 2026-02-06

### Added
- Initial release
- Split-flap display animation with an authentic look
- Support for the FlightRadar24 integration's area sensors
- Configurable animation speed (`flip_duration`)
- Configurable delay between characters (`flip_delay`)
- Configurable number of flights shown (`max_flights`)
- Customisable title (`title`)
- Automatic detection and animation only where data changed
- Formatting for:
  - Arrival times
  - Flight numbers
  - Origin airports
  - Flight status (LANDED, EXPECTED, delays)
  - Aircraft types
- Dark, realistic design with:
  - Gradients on the flaps
  - Shadows and a 3D effect
  - A horizontal divider on each flap
  - Brightness effects during the animation
- HACS support
- German localisation
- Extensive documentation

### Technical details
- Custom element: `flightradar24-splitflap-card`
- Shadow DOM for encapsulated styles
- CSS animations for performance
- Event-based updates (no polling)
- Render performance optimised through selective updates

[Unreleased]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.6.0-beta.2...HEAD
[0.6.0-beta.2]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.6.0-beta.1...0.6.0-beta.2
[0.6.0-beta.1]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.5.0...0.6.0-beta.1
[0.5.0]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.5.0-beta.2...0.5.0
[0.5.0-beta.2]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.5.0-beta.1...0.5.0-beta.2
[0.5.0-beta.1]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.4.1...0.5.0-beta.1
[0.4.1]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.4.1-beta.1...0.4.1
[0.4.1-beta.1]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.4.0...0.4.1-beta.1
[0.4.0]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.4.0-beta.1...0.4.0
[0.4.0-beta.1]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.3.0...0.4.0-beta.1
[0.3.0]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.3.0-beta.1...0.3.0
[0.3.0-beta.1]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/v0.2.0-beta...0.3.0-beta.1
[0.2.0]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/GpsM2/flightradar24-splitflap-card/releases/tag/v0.1.0
