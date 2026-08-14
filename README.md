# FlightRadar24 Split-Flap Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub Release](https://img.shields.io/github/release/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](https://github.com/GpsM2/flightradar24-splitflap-card/releases)
[![License](https://img.shields.io/github/license/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](LICENSE)

Eine Custom Lovelace Card für Home Assistant, die Flugdaten der [FlightRadar24-Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) im Stil einer klassischen Flughafen-Anzeigetafel mit animierten Split-Flap-Displays darstellt.

**Noch in aktiver Entwicklung.** Feedback und Beiträge sind willkommen – siehe [CONTRIBUTING.md](CONTRIBUTING.md).

![Split-Flap Demo](https://via.placeholder.com/800x400.png?text=Demo+GIF+hier)

## Features

- Authentische Split-Flap-Animation – jedes Zeichen dreht sich einzeln, nur geänderte Zeichen werden animiert
- Für die Airport-Sensoren der Integration: Ankünfte und Abflüge eines Flughafens
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
2. Den **gesamten Inhalt** des `dist`-Ordners nach `/config/www/flightradar24-splitflap-card/`
   kopieren – also `flightradar24-splitflap-card.js` **und** den Ordner
   `translations/`. Ohne die Übersetzungsdateien läuft die Card weiterhin,
   zeigt dann aber alle Texte auf Englisch.
3. Ressource in Home Assistant hinzufügen: **Einstellungen** → **Dashboards** → **Ressourcen** (drei Punkte oben rechts) → **Ressource hinzufügen**
   - URL: `/local/flightradar24-splitflap-card/flightradar24-splitflap-card.js`
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
language: de                # en, de, es, fr – ohne Angabe: Sprache von Home Assistant
max_flights: 8               # Anzahl angezeigter Flüge, Standard: 8
board: auto                  # auto, arrivals, departures – Standard: auto
flip_duration: 800           # Dauer der Flip-Animation in ms, Standard: 800
flip_delay: 50                # Verzögerung zwischen Buchstaben in ms, Standard: 50
visible_fields:               # welche Spalten angezeigt werden
  time: true
  flight: true
  airport: true
  status: true
  aircraft: true
```

### Ankünfte oder Abflüge

Die Card erkennt selbst, ob der gewählte Sensor eine Ankunfts- oder
Abflugtafel ist, und passt sich an:

| | Ankünfte | Abflüge |
|---|---|---|
| Spaltenüberschrift | `VON` | `NACH` |
| Angezeigte Zeit | geplante Ankunft | geplanter Abflug |
| Automatischer Titel | `ANKÜNFTE` | `ABFLÜGE` |

Erkannt wird das am Icon des Sensors, das die Integration je Richtung
vorgibt. Nur falls das fehlschlägt – etwa weil das Icon in Home Assistant
überschrieben wurde – lässt sich die Richtung mit `board: arrivals` bzw.
`board: departures` fest vorgeben.

Ein Flug nennt immer nur den *anderen* Flughafen: Auf einer Ankunftstafel
ist das die Herkunft, auf einer Abflugtafel das Ziel. Deshalb gibt es genau
eine Flughafen-Spalte (`visible_fields.airport`), deren Beschriftung sich
mit der Richtung ändert.

## Unterstützte Entities

Diese Card ist eine Ankunfts-/Abflugtafel und arbeitet mit den Airport-Sensoren der Integration:

- `sensor.flightradar24_airport_arrivals` – Ankünfte eines Flughafens
- `sensor.flightradar24_airport_departures` – Abflüge eines Flughafens

Angezeigt werden können: Zeit, Flugnummer, Herkunft/Ziel, Status und Flugzeugtyp.

Die Area-Sensoren der Integration (`current_in_area`, `entered_area`, `exited_area`, `additional_tracked`) werden von dieser Card bewusst nicht unterstützt – sie liefern Live-Positionsdaten statt Fahrplandaten und passen nicht zum Format einer Anzeigetafel. Die Sensoren selbst bleiben davon unberührt und können weiterhin in anderen Karten und Automationen genutzt werden.

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
    entity: sensor.flightradar24_airport_arrivals
    above: 0
card:
  type: custom:flightradar24-splitflap-card
  entity: sensor.flightradar24_airport_arrivals
  title: ANKÜNFTE
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

## Sprachen

Mitgeliefert sind Englisch, Deutsch, Spanisch und Französisch. Ohne gesetzte
Option `language` folgt die Card der Sprache von Home Assistant; für nicht
unterstützte Sprachen fällt sie auf Englisch zurück.

Alle Texte – auch die des Konfigurationseditors – liegen in
`dist/translations/<sprache>.json` und werden zur Laufzeit geladen. Eine neue
Sprache erfordert daher keine Änderung am JavaScript: Datei kopieren,
übersetzen, in `SUPPORTED_LANGUAGES` eintragen. Spanisch und Französisch sind
bislang nicht muttersprachlich geprüft – Korrekturen sind willkommen.

## Beitragen

Beiträge sind willkommen – siehe [CONTRIBUTING.md](CONTRIBUTING.md). Bugs und Feature-Wünsche bitte als [Issue](https://github.com/GpsM2/flightradar24-splitflap-card/issues) melden.

## Credits

- Basiert auf der [FlightRadar24 Home Assistant Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) von AlexandrErohin
- Inspiriert von klassischen mechanischen Flughafen-Anzeigetafeln

## Lizenz

MIT – siehe [LICENSE](LICENSE)
