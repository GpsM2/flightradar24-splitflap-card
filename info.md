# FlightRadar24 Split-Flap Card

Eine Custom Lovelace Card für Home Assistant, die Flugdaten im Stil einer klassischen Flughafen-Anzeigetafel mit animierten Split-Flap-Displays darstellt.

## Features

- 🎯 Authentische Split-Flap-Animation
- 🔄 Intelligente Updates (nur geänderte Zeichen werden animiert)
- 📊 Übersichtliche Darstellung aller Flugdaten
- 🎨 Realistisches dunkles Design
- ⚙️ Voll konfigurierbar

## Voraussetzungen

Diese Card benötigt die [FlightRadar24 Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24).

## Schnellstart

**Für Flughafen Ankünfte:**
```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
```

**Für Flughafen Abflüge:**
```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_departures
```

## Konfiguration

| Option | Standard | Beschreibung |
|--------|----------|--------------|
| `entity` | **erforderlich** | FlightRadar24 Airport-Sensor (Arrivals oder Departures) |
| `title` | automatisch | Überschrift |
| `language` | Sprache von HA | `en`, `de`, `es`, `fr` |
| `max_flights` | `8` | Anzahl Flüge |
| `board` | `auto` | `auto`, `arrivals`, `departures` – Richtung der Tafel |
| `flip_duration` | `800` | Animation Dauer (ms) |
| `flip_delay` | `50` | Verzögerung zwischen Buchstaben (ms) |
| `visible_fields` | alle | Welche Spalten angezeigt werden |

## Beispiel

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE FRANKFURT
max_flights: 10
flip_duration: 1000
flip_delay: 75
```

## Unterstützung

Bei Problemen oder Fragen erstelle bitte ein [Issue auf GitHub](https://github.com/GpsM2/flightradar24-splitflap-card/issues).
