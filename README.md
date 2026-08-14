# FlightRadar24 Split-Flap Card

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/custom-components/hacs)
[![GitHub Release](https://img.shields.io/github/release/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](https://github.com/GpsM2/flightradar24-splitflap-card/releases)
[![License](https://img.shields.io/github/license/GpsM2/flightradar24-splitflap-card.svg?style=flat-square)](LICENSE)

Eine Custom Lovelace Card für Home Assistant, die Flugdaten der [FlightRadar24-Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24) im Stil einer klassischen Flughafen-Anzeigetafel mit animierten Split-Flap-Displays darstellt.

**Noch in aktiver Entwicklung.** Feedback und Beiträge sind willkommen – siehe [CONTRIBUTING.md](CONTRIBUTING.md).

![Ankunft, dunkles Theme](docs/screenshots/arrivals-dark.png)

<details>
<summary>Weitere Ansichten (Abflug, helles Theme)</summary>

![Abflug, dunkles Theme](docs/screenshots/departures-dark.png)
![Ankunft, helles Theme](docs/screenshots/arrivals-light.png)

</details>

## Features

- Authentische Split-Flap-Animation – jedes Zeichen dreht sich einzeln, nur geänderte Zeichen werden animiert
- Für die Airport-Sensoren der Integration: Ankunft und Abflug eines Flughafens
- Verspätungsanzeige: geplante und erwartete Zeit nebeneinander, farblich abgesetzt
- Heller und dunkler Modus, folgt automatisch dem Home-Assistant-Theme
- Responsives Raster: die Kacheln verkleinern sich, bis die Tafel in die Karte passt
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

## Karte hinzufügen

Die Karte wird über die Oberfläche von Home Assistant eingerichtet – YAML ist
nicht nötig.

1. Dashboard bearbeiten → **Karte hinzufügen**
2. Nach „FlightRadar24 Split-Flap Card" suchen und auswählen
3. Im Editor den gewünschten Sensor wählen – zur Auswahl stehen nur die
   Ankunfts- und Abflugtafeln, andere FlightRadar24-Sensoren werden
   ausgeblendet
4. Restliche Optionen nach Bedarf anpassen und speichern

Ab Home Assistant 2026.6 geht es noch direkter: beim Hinzufügen einer Karte
zuerst den Sensor auswählen – diese Karte wird dann automatisch vorgeschlagen.

> **Zwei Tafeln nebeneinander?** Jede Tafel als **eigene Karte** einfügen, nicht
> über eine Stapel-Karte (`vertical-stack`) kombinieren. Eine Stapel-Karte meldet
> Home Assistant ihre eigene Größe für die ganze Gruppe, wodurch die Höhe der
> enthaltenen Tafeln nicht mehr richtig berechnet wird und der Abschnitt in den
> darunterliegenden überläuft.

## Optionen

Alle Optionen stehen im visuellen Editor zur Verfügung. Die YAML-Namen sind hier
nur als Referenz aufgeführt – etwa zum Nachschlagen im Code-Editor.

| Option | Standard | Bedeutung |
|---|---|---|
| `entity` | – | Ankunfts- oder Abflug-Sensor (erforderlich) |
| `title` | automatisch | Überschrift; leer = Richtung der Tafel |
| `language` | Sprache von HA | `en`, `de`, `es`, `fr` |
| `max_flights` | `8` | Anzahl angezeigter Flüge |
| `board` | `auto` | `auto`, `arrivals`, `departures` |
| `theme` | `auto` | `auto`, `dark`, `light` |
| `flip_duration` | `800` | Dauer der Flip-Animation (ms) |
| `flip_delay` | `50` | Verzögerung zwischen Zeichen (ms) |
| `visible_fields` | alle | Sichtbare Spalten (siehe Editor) |

### Ankunft oder Abflug

Die Card erkennt selbst, ob der gewählte Sensor eine Ankunfts- oder
Abflugtafel ist, und passt sich an:

| | Ankunft | Abflug |
|---|---|---|
| Spaltenüberschrift | `VON` | `NACH` |
| Angezeigte Zeit | geplante Ankunft | geplanter Abflug |
| Automatischer Titel | `ANKUNFT` | `ABFLUG` |

Erkannt wird das am Icon des Sensors, das die Integration je Richtung
vorgibt. Nur falls das fehlschlägt – etwa weil das Icon in Home Assistant
überschrieben wurde – lässt sich die Richtung im Editor unter
**Richtung der Tafel** fest vorgeben.

Ein Flug nennt immer nur den *anderen* Flughafen: Auf einer Ankunftstafel
ist das die Herkunft, auf einer Abflugtafel das Ziel. Deshalb gibt es genau
eine Flughafen-Spalte, deren Beschriftung sich mit der Richtung ändert.

## Unterstützte Entities

Diese Card ist eine Ankunfts-/Abflugtafel und arbeitet mit den Airport-Sensoren der Integration:

- `sensor.flightradar24_airport_arrivals` – Ankunft eines Flughafens
- `sensor.flightradar24_airport_departures` – Abflug eines Flughafens

Angezeigt werden können: Zeit, Flugnummer, Herkunft/Ziel, Status und Flugzeugtyp.

Die Area-Sensoren der Integration (`current_in_area`, `entered_area`, `exited_area`, `additional_tracked`) werden von dieser Card bewusst nicht unterstützt – sie liefern Live-Positionsdaten statt Fahrplandaten und passen nicht zum Format einer Anzeigetafel. Die Sensoren selbst bleiben davon unberührt und können weiterhin in anderen Karten und Automationen genutzt werden.

## Ankunft und Abflug zusammen anzeigen

Beide Tafeln jeweils als **eigene Karte** hinzufügen und im Dashboard
untereinander anordnen. Nicht über eine Stapel-Karte kombinieren – siehe den
Hinweis oben.

## Problembehandlung

**Card wird nicht angezeigt**
1. FlightRadar24-Integration installiert und konfiguriert?
2. Browser-Konsole (F12) auf Fehler beim Laden der Ressource prüfen
3. Browser-Cache leeren (Strg+F5)

**Keine Flüge sichtbar**
- **Entwicklerwerkzeuge** → **Zustände** → prüfen, ob der Sensor ein `flights`-Attribut mit Einträgen liefert

**Karte läuft in den darunterliegenden Abschnitt über**
- Tritt auf, wenn die Karte in einer Stapel-Karte (`vertical-stack`,
  `grid`, …) steckt: die Stapel-Karte meldet Home Assistant ihre eigene
  Größe für die ganze Gruppe. Jede Tafel als eigene Karte einfügen.

**Animation wirkt ruckelig**
- `max_flights` reduzieren oder das Scan-Interval der FlightRadar24-Integration auf mindestens 60 Sekunden erhöhen

Weitere Details in [INSTALLATION.md](INSTALLATION.md).

## Verspätungen

Neben der geplanten Zeit steht die erwartete – aber nur, wenn sie abweicht.
Eine gefüllte Zelle in dieser Spalte heißt also immer: dieser Flug läuft
nicht nach Plan.

Die Statusspalte fasst zusammen, was das bedeutet:

| Anzeige | Bedeutung |
|---|---|
| `PÜNKTLICH` | weniger als 5 Minuten Abweichung |
| `+8 MIN` | 8 Minuten später als geplant |
| `-12 MIN` | 12 Minuten früher als geplant |
| `PLANMÄSSIG` | noch keine Schätzung verfügbar |
| `GELANDET` / `ABGEFLOGEN` | bereits erfolgt |
| `ANNULLIERT` / `UMGELEITET` | Flug findet nicht wie geplant statt |

Verspätungen und Annullierungen sind rot, pünktliche Flüge grün. Die Farbe
ergänzt den Text nur – die Aussage steht immer auch als Wort da.

Ein Hinweis zur Breite: Mit allen Spalten braucht die Tafel etwa 820 px.
Auf schmaleren Karten lässt sie sich horizontal scrollen; wer das vermeiden
will, blendet über `visible_fields` nicht benötigte Spalten aus.

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
