# FlightRadar24 Split-Flap Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub Release](https://img.shields.io/github/release/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](https://github.com/GpsM2/flightradar24-splitflap-card/releases)
[![License](https://img.shields.io/github/license/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](LICENSE)

Eine Custom Lovelace Card für Home Assistant, die Flugdaten der [FlightRadar24-Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) im Stil einer klassischen Flughafen-Anzeigetafel mit animierten Split-Flap-Displays darstellt.

**Noch in aktiver Entwicklung.** Feedback und Beiträge sind willkommen – siehe [CONTRIBUTING.md](CONTRIBUTING.md).

![Split-Flap Demo](https://via.placeholder.com/800x400.png?text=Demo+GIF+hier)

## Features

- Authentische Split-Flap-Animation – jedes Zeichen dreht sich einzeln, nur geänderte Zeichen werden animiert
- Unterstützt Airport-Sensoren (Arrivals/Departures) sowie die Area-Sensoren der Integration, mit automatischer Erkennung des Sensor-Typs
- Konfigurierbare Animationsgeschwindigkeit, Zeilenanzahl und sichtbare Spalten
- Mehrsprachige Oberfläche (Deutsch, Englisch, Spanisch, Französisch)
- Visueller Konfigurationseditor – keine YAML-Kenntnisse nötig

## Voraussetzungen

- Home Assistant 2026.2.0 oder neuer
- [FlightRadar24 Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24), installiert und konfiguriert

## Installation

### HACS (empfohlen)

1. HACS öffnen → **Frontend**
2. Drei-Punkte-Menü oben rechts → **Benutzerdefinierte Repositories**
3. Repository-URL hinzufügen: `https://github.com/GpsM2/flightradar24-splitflap-card`, Kategorie **Lovelace**
4. Nach „FlightRadar24 Split-Flap Card" suchen und installieren
5. Home Assistant neu starten

### Manuell

1. Neueste Version von [Releases](https://github.com/GpsM2/flightradar24-splitflap-card/releases) herunterladen
2. `flightradar24-splitflap-card.js` nach `/config/www/` kopieren
3. Ressource in Home Assistant hinzufügen: **Einstellungen** → **Dashboards** → **Ressourcen** (drei Punkte oben rechts) → **Ressource hinzufügen**
   - URL: `/local/flightradar24-splitflap-card.js`
   - Ressourcentyp: **JavaScript-Modul**
4. Browser-Cache leeren (Strg+F5)

## Konfiguration

Alle Optionen sind auch über den visuellen Editor verfügbar (Karte hinzufügen → „FlightRadar24 Split-Flap Card").

### Minimal

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
```

### Alle Optionen

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals  # erforderlich
title: ANKÜNFTE FRANKFURT   # Überschrift, Standard: automatisch anhand der Entity
language: de                # en, de, es, fr – Standard: en
max_flights: 8               # Anzahl angezeigter Flüge, Standard: 8
mode: auto                   # auto, airport, oder area – Standard: auto
flip_duration: 800           # Dauer der Flip-Animation in ms, Standard: 800
flip_delay: 50                # Verzögerung zwischen Buchstaben in ms, Standard: 50
visible_fields:               # welche Spalten angezeigt werden
  time: true
  flight: true
  from: true
  to: false
  status: true
  aircraft: true
  altitude: false
  speed: false
```

## Unterstützte Entities

Die Card erkennt den Sensor-Typ automatisch (`mode: auto`):

**Airport-Sensoren** (empfohlen)
- `sensor.flightradar24_airport_arrivals` – Ankünfte eines Flughafens
- `sensor.flightradar24_airport_departures` – Abflüge eines Flughafens

**Area-Sensoren**
- `sensor.flightradar24_current_in_area` – aktuell in der konfigurierten Region
- `sensor.flightradar24_entered_area` – kürzlich eingetreten
- `sensor.flightradar24_exited_area` – kürzlich ausgetreten
- `sensor.flightradar24_additional_tracked` – zusätzlich verfolgte Flüge

Angezeigt werden können: Zeit, Flugnummer, Herkunft/Ziel, Status, Flugzeugtyp sowie (bei Area-Sensoren) Höhe und Geschwindigkeit.

## Beispiele

**Ankünfte und Abflüge kombiniert**

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

**Nur bei vorhandenen Flügen anzeigen**

```yaml
type: conditional
conditions:
  - condition: numeric_state
    entity: sensor.flightradar24_current_in_area
    above: 0
card:
  type: custom:flightradar24-splitflap-card
  entity: sensor.flightradar24_current_in_area
  title: FLÜGE IN DER NÄHE
```

## Problembehandlung

**Card wird nicht angezeigt**
1. FlightRadar24-Integration installiert und konfiguriert?
2. Browser-Konsole (F12) auf Fehler beim Laden der Ressource prüfen
3. Browser-Cache leeren (Strg+F5)

**Keine Flüge sichtbar**
- **Entwicklerwerkzeuge** → **Zustände** → prüfen, ob der Sensor ein `flights`-Attribut mit Einträgen liefert

**Animation wirkt ruckelig**
- `max_flights` reduzieren oder das Scan-Interval der FlightRadar24-Integration auf mindestens 60 Sekunden erhöhen

Weitere Details in [INSTALLATION.md](INSTALLATION.md).

## Beitragen

Beiträge sind willkommen – siehe [CONTRIBUTING.md](CONTRIBUTING.md). Bugs und Feature-Wünsche bitte als [Issue](https://github.com/GpsM2/flightradar24-splitflap-card/issues) melden.

## Credits

- Basiert auf der [FlightRadar24 Home Assistant Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) von AlexandrErohin
- Inspiriert von klassischen mechanischen Flughafen-Anzeigetafeln

## Lizenz

MIT – siehe [LICENSE](LICENSE)
