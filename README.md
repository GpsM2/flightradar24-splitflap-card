# FlightRadar24 Split-Flap Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub Release](https://img.shields.io/github/release/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](https://github.com/GpsM2/flightradar24-splitflap-card/releases)
[![License](https://img.shields.io/github/license/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](LICENSE)

## ⚠️ Achtung, noch in Entwicklung - Help wanted ⚠️

Eine Custom Lovelace Card für Home Assistant, die Flugdaten im Stil einer klassischen Flughafen-Anzeigetafel mit animierten Split-Flap-Displays darstellt.

![Split-Flap Demo](https://via.placeholder.com/800x400.png?text=Demo+GIF+hier)

## ✨ Features

- 🎯 **Authentische Split-Flap-Animation** - Jeder Buchstabe dreht sich einzeln wie bei mechanischen Flughafen-Tafeln
- 🔄 **Intelligente Updates** - Nur geänderte Zeichen werden animiert
- 📊 **Übersichtliche Darstellung** - Zeit, Flugnummer, Herkunft, Status und Flugzeugtyp
- 🎨 **Realistisches Design** - Dunkles Theme mit Farbverläufen und Schatten
- ⚙️ **Voll konfigurierbar** - Animationsgeschwindigkeit, Anzahl der Flüge, Titel anpassbar
- 🌍 **Mehrsprachig** - Deutsche Standardtexte, einfach anpassbar

## 📋 Voraussetzungen

- Home Assistant 2026.2.0 oder neuer
- [FlightRadar24 Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) installiert und konfiguriert

## 🚀 Installation

### HACS (empfohlen)

1. Öffne HACS in deiner Home Assistant Installation
2. Klicke auf "Frontend"
3. Klicke auf die drei Punkte oben rechts
4. Wähle "Benutzerdefinierte Repositories"
5. Füge folgende URL hinzu: `https://github.com/GpsM2/flightradar24-splitflap-card`
6. Wähle Kategorie: "Lovelace"
7. Klicke auf "Hinzufügen"
8. Suche nach "FlightRadar24 Split-Flap Card" und klicke auf "Installieren"
9. Starte Home Assistant neu

### Manuelle Installation

1. Lade die neueste Version von [Releases](https://github.com/GpsM2/flightradar24-splitflap-card/releases) herunter
2. Kopiere `flightradar24-splitflap-card.js` nach `/config/www/`
3. Füge die Ressource in Home Assistant hinzu:
   - Gehe zu **Einstellungen** → **Dashboards** → **Ressourcen** (drei Punkte oben rechts)
   - Klicke auf **Ressource hinzufügen**
   - URL: `/local/flightradar24-splitflap-card.js`
   - Ressourcentyp: **JavaScript-Modul**
4. Aktualisiere deinen Browser-Cache (Strg+F5)

## 🎨 Verwendung

### Basis-Konfiguration

**Mit Airport Arrivals Sensor (empfohlen):**
```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
```

**Mit Area Sensor:**
```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_current_in_area
```

### Erweiterte Konfiguration

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE FRANKFURT
max_flights: 8
flip_duration: 800
flip_delay: 50
mode: auto  # auto, airport, oder area
```

## ⚙️ Konfigurations-Optionen

| Option | Typ | Standard | Beschreibung |
|--------|-----|----------|--------------|
| `entity` | string | **erforderlich** | Die FlightRadar24 Sensor Entity (z.B. `sensor.flightradar24_airport_arrivals` oder `sensor.flightradar24_current_in_area`) |
| `title` | string | `ANKÜNFTE` | Überschrift der Anzeigetafel |
| `max_flights` | number | `8` | Maximale Anzahl anzuzeigender Flüge |
| `flip_duration` | number | `800` | Dauer der Flip-Animation in Millisekunden |
| `flip_delay` | number | `50` | Verzögerung zwischen einzelnen Buchstaben in Millisekunden |
| `mode` | string | `auto` | Sensor-Modus: `auto` (automatische Erkennung), `airport` (Airport Arrivals/Departures), oder `area` (Area Sensoren) |

## 📊 Unterstützte Entities

Die Card unterstützt alle FlightRadar24 Sensoren und erkennt automatisch den Typ:

### Airport Sensoren (empfohlen)
- `sensor.flightradar24_airport_arrivals` - Ankünfte eines bestimmten Flughafens
- `sensor.flightradar24_airport_departures` - Abflüge eines bestimmten Flughafens

### Area Sensoren
- `sensor.flightradar24_current_in_area` - Aktuell in deiner Region
- `sensor.flightradar24_entered_area` - Kürzlich eingetreten
- `sensor.flightradar24_exited_area` - Kürzlich ausgetreten
- `sensor.flightradar24_additional_tracked` - Zusätzlich verfolgte Flüge

Die Card erkennt automatisch, welchen Sensor-Typ du verwendest und passt die Darstellung an.

## 💡 Beispiele

### Flughafen Ankünfte

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE FRANKFURT
max_flights: 10
```

### Flughafen Abflüge

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_departures
title: ABFLÜGE FRANKFURT
max_flights: 10
```

### Flüge in der Nähe

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_current_in_area
title: FLÜGE IN DER NÄHE
max_flights: 6
```

### Kompakte Anzeige

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE
max_flights: 4
flip_duration: 600
flip_delay: 30
```

### Langsame, dramatische Animation

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE FRANKFURT
flip_duration: 1200
flip_delay: 100
```

### Mehrere Tafeln

```yaml
type: vertical-stack
cards:
  - type: custom:flightradar24-splitflap-card
    entity: sensor.flightradar24_airport_arrivals
    title: ANKÜNFTE
    max_flights: 5
    
  - type: custom:flightradar24-splitflap-card
    entity: sensor.flightradar24_airport_departures
    title: ABFLÜGE
    max_flights: 5
```

## 🎯 Angezeigte Informationen

- **ZEIT**: Geplante Ankunftszeit
- **FLUG**: Flugnummer oder Callsign
- **VON**: Abflughafen (IATA-Code oder Stadt)
- **STATUS**: 
  - `GELANDET` - Flugzeug ist gelandet
  - `ERWARTET` - Pünktlich
  - `+XX MIN` - Verspätung in Minuten
  - `FRÜHER` - Früher als geplant
- **FLUGZEUG**: Flugzeugtyp

## 🔧 Problembehandlung

### Card wird nicht angezeigt

1. Stelle sicher, dass die FlightRadar24 Integration installiert und konfiguriert ist
2. Überprüfe, ob die JavaScript-Ressource korrekt geladen wurde (Browser-Konsole: F12)
3. Lösche den Browser-Cache und lade die Seite neu (Strg+F5)

### Keine Flüge werden angezeigt

1. Überprüfe, ob der Sensor Daten liefert:
   - Gehe zu **Entwicklerwerkzeuge** → **Zustände**
   - Suche nach deinem Sensor
   - Prüfe ob `flights` im Attribut vorhanden sind

### Animation funktioniert nicht

1. Stelle sicher, dass sich die Daten tatsächlich ändern
2. Erhöhe `flip_duration` für eine sichtbarere Animation
3. Überprüfe die Browser-Konsole auf JavaScript-Fehler

## 💡 Tipps & Tricks

- **Beste Animation**: Setze das Scan-Interval der FlightRadar24 Integration auf mindestens 60 Sekunden
- **Große Displays**: Auf größeren Bildschirmen wirkt die Animation besonders beeindruckend
- **Kombinationen**: Kombiniere mehrere Cards für Ankünfte und Abflüge
- **Performance**: Bei vielen Flügen reduziere `max_flights` für bessere Performance

## 🤝 Beitragen

Beiträge sind willkommen! Bitte erstelle einen Pull Request oder öffne ein Issue.

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE) Datei

## 🙏 Credits

- Basierend auf der [FlightRadar24 Home Assistant Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) von AlexandrErohin
- Inspiriert von klassischen mechanischen Flughafen-Anzeigetafeln

## ⭐ Changelog

### Version 0.1.0
- Erste Veröffentlichung
- Split-Flap-Animation
- Unterstützung für alle FlightRadar24 Sensoren
- Konfigurierbare Animations-Parameter

---

Wenn dir diese Card gefällt, gib ihr einen Stern ⭐ auf GitHub!
