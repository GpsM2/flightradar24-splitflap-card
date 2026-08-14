# Installation & setup

## Step 1: check the prerequisites

### Install the FlightRadar24 integration

This card needs the
[FlightRadar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24).

If it isn't installed yet:

1. Open HACS
2. Search for "FlightRadar24"
3. Install the integration
4. Restart Home Assistant
5. Configure the integration (Settings → Devices & services → Add integration)

## Step 2: install the Split-Flap Card

### Via HACS (recommended)

1. Open HACS
2. Click "Frontend"
3. Three-dot menu at the top right → "Custom repositories"
4. Add the repository URL:
   ```
   https://github.com/GpsM2/flightradar24-splitflap-card
   ```
5. Choose category "Lovelace"
6. Click "Add"
7. Search for "FlightRadar24 Split-Flap Card"
8. Install
9. Clear the browser cache (Ctrl+F5)

### Manual installation

1. Download the [latest release](https://github.com/GpsM2/flightradar24-splitflap-card/releases)
2. Copy the entire contents of the `dist` folder to
   `/config/www/flightradar24-splitflap-card/` — the JavaScript file plus the
   `translations/` and `fonts/` folders
3. In Home Assistant:
   - **Settings** → **Dashboards**
   - Three-dot menu → **Resources**
   - **Add resource**
   - URL: `/local/flightradar24-splitflap-card/flightradar24-splitflap-card.js`
   - Type: **JavaScript module**
   - Save
4. Clear the browser cache (Ctrl+F5)

## Step 3: add the card to a dashboard

The card is set up through the interface — no YAML needed.

1. Edit the dashboard → **Add card**
2. Search for "FlightRadar24 Split-Flap Card" and select it
3. Pick the sensor in the editor. Only the arrivals and departures boards are
   offered — the integration's area and statistics sensors are filtered out
   because they carry no schedule data.
4. Adjust the options and save

From Home Assistant 2026.6 there is an even shorter route: when adding a card,
pick the sensor first and this card offers itself automatically.

## Step 4: adjust the options

Every option is available in the visual editor. The YAML names serve as a
reference, for looking things up in the code editor:

| Option | Default | Meaning |
|---|---|---|
| `entity` | – | Arrivals or departures sensor (required) |
| `title` | automatic | Heading; empty = the board's direction |
| `language` | HA language | `en`, `de`, `es`, `fr` |
| `max_flights` | `8` | Number of flights shown (1–20) |
| `board` | `auto` | `auto`, `arrivals`, `departures` |
| `theme` | `auto` | `auto`, `dark`, `light` |
| `accent_color` | theme colour | Custom accent colour |
| `rail_style` | `accent` | `accent`, `solid`, `rainbow`, `none` |
| `flip_style` | `flip` | `flip`, `scramble` |
| `flip_duration` | `800` | Flip animation duration (ms) |
| `flip_delay` | `50` | Delay between characters (ms) |
| `visible_fields` | all | Which columns are shown |

### Supported sensors

- `sensor.flightradar24_airport_arrivals` — arrivals at an airport
- `sensor.flightradar24_airport_departures` — departures from an airport

The integration's area sensors (`current_in_area`, `entered_area`,
`exited_area`, `additional_tracked`) are not supported by this card — they carry
live position data rather than schedule data. The sensors themselves remain
usable as before, just in other cards.

### Showing arrivals and departures together

Add each board as its **own card** and arrange them one below the other on the
dashboard.

> **Don't** combine them in a stack card (`vertical-stack`, `grid`, …): a stack
> reports its own size to Home Assistant for the whole group, so the height of
> the boards inside it is no longer calculated correctly and the section
> overflows into the one below.

## Troubleshooting

### The card doesn't appear

**Check the browser console** (F12):

- Are there JavaScript errors?
- Was the resource loaded?

**Fix:**
1. Clear the browser cache (Ctrl+F5)
2. Restart Home Assistant
3. Add the resource again

### No data visible

**Check the sensor:**

1. **Developer tools** → **States**
2. Look for `sensor.flightradar24_airport_arrivals`
3. Check that the `flights` attribute contains data

**Possible causes:**
- No flights currently reported for this airport
- The FlightRadar24 integration isn't configured correctly
- No airport set in the integration

### The card overflows into the section below

Happens when the card sits inside a stack card. Add each board as its own card.

### The animation stutters

**Reduce the number of flights** in the editor (option "Maximum flights").

**Or raise the update interval:**

In the FlightRadar24 integration:
- Settings → Devices & services → FlightRadar24
- Raise the scan interval to at least 60 seconds

### Wrong data

**Caching problem:**
1. Clear the browser cache completely
2. Restart Home Assistant
3. Test in a private window

## Recommended settings

All of these are available in the visual editor.

| Use case | Flights | Animation duration | Delay |
|---|---|---|---|
| Realistic | 8 | 800 ms — real boards run about this fast | 60 ms |
| Weaker devices | 5 | 600 ms | 30 ms |
| Large displays | 15 | 1000 ms | 100 ms |
| Phone | 4 | 800 ms | 50 ms |

## Tips

1. **Adjust the integration's update interval**
   60–120 seconds works well with the animation

2. **Monitor several airports**
   Create multiple FlightRadar24 devices for different airports

3. **Use automations**
   Send notifications when new flights appear

4. **Themes**
   The card follows your Home Assistant theme automatically

5. **Mobile**
   Show fewer flights on phones

## Support

If something goes wrong:

1. Search the [issues on GitHub](https://github.com/GpsM2/flightradar24-splitflap-card/issues)
2. Open a new issue with:
   - Home Assistant version
   - Browser and version
   - Error messages from the console
   - Your configuration (without sensitive data)

## Further reading

- [FlightRadar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24)
- [Home Assistant Lovelace documentation](https://www.home-assistant.io/lovelace/)
- [HACS documentation](https://hacs.xyz/)
