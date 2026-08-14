# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

### Geändert
- Die Tafel sieht jetzt wie ein einzelnes physisches Objekt aus: beschriftete
  und leere Klappen sind identisch gestaltet, die Faltlinie läuft durch das
  Zeichen statt dahinter, und die Klappen sind deutlich weniger hoch – ein
  Großbuchstabe füllt jetzt rund zwei Drittel der Klappenhöhe statt einem
  Drittel.
- Eigene Schriftart: JetBrains Mono Bold, serifenlos, wird aus dem Repository
  geladen. Es werden keine Schriften von Dritten nachgeladen.
- Alle Zeichen auf der Tafel erscheinen in Großbuchstaben.

### Hinzugefügt
- Randstreifen wählbar: Akzentfarbe auslaufend oder durchgehend, Regenbogen
  oder ganz aus.
- Eigene Akzentfarbe einstellbar.
- Zweite Animationsart: Die Klappen können die Zeichen bis zum Ziel
  durchlaufen, statt direkt umzuschlagen.

### Geändert
- Deutsche Beschriftung der Tafeln auf Einzahl umgestellt: `ANKUNFT` und
  `ABFLUG` statt `ANKÜNFTE` und `ABFLÜGE`.
- Dokumentation auf die Einrichtung über die Oberfläche umgestellt. Die
  YAML-Beispiele sind entfernt – insbesondere das Beispiel mit der
  Stapel-Karte, das dazu führte, dass Home Assistant die Höhe der Karte
  falsch berechnete und der Abschnitt in den darunterliegenden überlief.

## [0.5.0] - 2026-08-15

Promoted from 0.5.0-beta.2 after maintainer testing, no code changes. See
the beta entries below for what's actually in this release.

## [0.5.0-beta.2] - 2026-08-15

### Behoben
- Einzelne Zeichen behielten nach einer Aktualisierung die falsche Farbe
  (betraf hellen und dunklen Modus). Die Markierung für leere Klappen
  wurde beim Umblättern nicht mitgeführt, sodass Kacheln mit Buchstaben
  weiterhin als leer galten – und damit weder eingefärbt wurden noch den
  richtigen Hintergrund bekamen.
- Wurde eine Spalte ausgeblendet, endete die Tafel mitten in der Karte
  statt am Rand. Die Zeilen laufen jetzt unabhängig von der Spaltenzahl
  bis zum Kartenrand durch.
- Die Zeichen saßen minimal zu hoch auf den Klappen und damit über der
  Faltlinie, die eigentlich mittig durch das Zeichen laufen soll.

## [0.5.0-beta.1] - 2026-08-14

### Behoben
- Der Konfigurationseditor stürzte mit „Cannot read properties of undefined
  (reading 'visible_fields')" ab, wenn Home Assistant die Entity-Daten vor
  der Konfiguration lieferte. Der Fehler bestand seit mindestens 0.3.
- Die Kartengröße wurde über `getLayoutOptions()` gemeldet, das in Home
  Assistant als veraltet markiert ist, und aus einer Pixel-Schätzung
  berechnet. Stattdessen kommt jetzt `getGridOptions()` mit `rows: "auto"`
  zum Einsatz – Home Assistant misst die tatsächliche Höhe der Karte,
  statt sich auf eine Umrechnung zu verlassen.

### Geändert
- Der Konfigurationseditor nutzt jetzt Home Assistants eigene
  Formular-Komponente statt eines handgebauten Formulars: native Optik,
  echte Entity-Suche und weniger eigener Code. Die Filterung auf
  Ankunfts-/Abflug-Sensoren bleibt erhalten.

### Hinzugefügt
- Die Card schlägt sich in Home Assistants Entity-Auswahl beim Hinzufügen
  einer Karte selbst vor, wenn ein Ankunfts- oder Abflug-Sensor gewählt
  wird (ab Home Assistant 2026.6).

## [0.4.1] - 2026-08-14

Promoted from 0.4.1-beta.1 after maintainer testing, no code changes. See
that entry below for what's actually in this release.

## [0.4.1-beta.1] - 2026-08-14

### Behoben
- `getCardSize()`/`getLayoutOptions()` gaben feste Werte zurück, unabhängig
  von `max_flights`. Home Assistant konnte die Höhe des reservierten
  Bereichs (Masonry- wie Sections-Ansicht) dadurch nicht an die Karte
  anpassen. Beide werden jetzt aus `max_flights` berechnet.
- Der Flugzeugtyp wurde bei 12 Zeichen hart abgeschnitten – bei 28 von 29
  echten Modellen in Produktivdaten, meist mit einem hängenden Bindestrich
  am Ende (`Airbus A320-`). Die Spalte ist jetzt 14 Zeichen breit und
  schneidet an der letzten Wort- oder Bindestrich-Grenze.
- Der Titel in der Kopfzeile saß 22 px links der Mitte, weil Icon- und
  Uhr-Spalte unterschiedlich breit waren. Beide teilen sich jetzt eine
  gemeinsame Breite.

## [0.4.0] - 2026-08-14

Promoted from 0.4.0-beta.1 after maintainer testing, no code changes. See
that entry below for what's actually in this release.

## [0.4.0-beta.1] - 2026-08-14

### Hinzugefügt
- Verspätungsanzeige: Neben der geplanten steht jetzt die erwartete Zeit,
  sofern sie abweicht. Die Statusspalte zeigt die Abweichung in Minuten
  (`+8 MIN`, `-12 MIN`) bzw. `PÜNKTLICH`, `GELANDET`, `ANNULLIERT`.
- Farbcodierung des Status: Verspätungen und Annullierungen rot, pünktliche
  Flüge grün. Die Farbe ergänzt den Text, ersetzt ihn nicht.
- Uhrzeit und ein Richtungssymbol (Start/Landung) im Kopf der Tafel.
- Die Airline-Kennung der Flugnummer ist farblich abgesetzt.
- Annullierte Flüge zeigen statt einer Uhrzeit Striche.

### Behoben
- Spalten liefen auf schmalen Karten aus dem Raster und die Beschriftungen
  passten nicht mehr zu den Daten. Kopfzeile und Zeilen teilten sich zwei
  getrennte Scroll-Container; beim Scrollen stand eine Spalte bis zu 150 px
  neben ihrer Überschrift. Beides liegt jetzt in einem gemeinsamen Raster.
- Die Meldung „Keine Flüge verfügbar" erschien nie – bei leerer Flugliste,
  nicht verfügbarer oder fehlender Entity blieb die Tafel einfach leer.
- Laufende Flip-Animationen wurden beim Entfernen der Karte nicht gestoppt.

### Hinzugefügt
- Heller und dunkler Modus. Ohne Angabe folgt die Card dem Theme von Home
  Assistant; mit `theme: dark` bzw. `theme: light` lässt sich das
  übersteuern.
- Die Tafel ist jetzt responsiv: die Kachelgröße richtet sich danach, wie
  viele Zeichen tatsächlich Platz finden müssen. Erst unterhalb einer
  Mindestgröße wird horizontal gescrollt.

### Geändert
- Neues Tafel-Design: durchgehendes Kachelraster, in dem auch ungenutzte
  Positionen als leere Klappen sichtbar bleiben, mit Akzentleisten an
  Ober- und Unterkante.

## [0.3.0] - 2026-08-14

Promoted from 0.3.0-beta.1 after maintainer testing, no code changes. See
that entry below for what's actually in this release.

## [0.3.0-beta.1] - 2026-08-14

### Hinzugefügt
- Alle Texte liegen jetzt in `dist/translations/<sprache>.json` und werden
  zur Laufzeit geladen. Das gilt auch für den Konfigurationseditor, der
  bisher durchgehend englisch war. Eine neue Sprache erfordert damit keine
  Änderung am JavaScript mehr.
- Ohne gesetzte Option `language` folgt die Card der Sprache von Home
  Assistant (`hass.locale.language`) statt fest Englisch zu verwenden.

### Behoben
- Zeiten wurden im englischen Gebietsschema als `07:50 AM` dargestellt und
  liefen aus der Zeitspalte heraus. Anzeigetafeln nutzen jetzt überall das
  24-Stunden-Format.
- Der Status wurde mitten im Wort abgeschnitten und blieb immer englisch:
  aus „Estimated dep 07:40" wurde „Estimated de". Die Card wertet jetzt
  das maschinenlesbare `status`-Feld aus und zeigt den übersetzten Status
  (`ERWARTET`, `PLANMÄSSIG`, `ANNULLIERT`, `GELANDET`, `ABGEFLOGEN`,
  `VERSPÄTET`, `UMGELEITET`). Unbekannte Status fallen auf den
  Originaltext zurück, der dann an einer Wortgrenze gekürzt wird.
- Auf einer Abflugtafel war die Spalte `VON` mit dem *Ziel* des Fluges
  gefüllt. Die Card erkennt jetzt die Richtung des Sensors und beschriftet
  die Spalte entsprechend `VON` (Ankünfte) bzw. `NACH` (Abflüge).
- Auf einer Abflugtafel zeigte die Zeitspalte die geplante *Ankunft* am
  Zielflughafen statt des Abflugs. Beispiel: Ein Flug mit
  „Estimated dep 07:40" wurde als `10:55` angezeigt.
- Der automatische Titel blieb generisch (`FLÜGE`), statt auf `ANKÜNFTE`
  bzw. `ABFLÜGE` umzustellen, sobald die Entity verfügbar war.

### Hinzugefügt
- Konfigurationsoption `board` (`auto`/`arrivals`/`departures`). Die
  Richtung wird normalerweise selbst erkannt; die Option ist nur nötig,
  falls das Icon des Sensors überschrieben wurde.

### Geändert
- Die ausgelieferten Dateien liegen jetzt im Ordner `dist/`. Bei einer
  HACS-Installation ändert sich dadurch nichts. Bei manueller Installation
  muss der gesamte `dist`-Inhalt kopiert werden, und die Ressourcen-URL
  lautet nun `/local/flightradar24-splitflap-card/flightradar24-splitflap-card.js`.
- `visible_fields.from` und `visible_fields.to` sind zu einer Spalte
  `visible_fields.airport` zusammengefasst. Ein Flug nennt immer nur den
  anderen Flughafen – der eigene steht nie in den Daten –, sodass die
  zweite Spalte technisch nie gefüllt werden konnte. Bestehende Configs
  mit `from: false` blenden die Spalte weiterhin aus.

### Entfernt
- Unterstützung für die Area-Sensoren (`current_in_area`, `entered_area`,
  `exited_area`, `additional_tracked`). Diese Card ist eine reine
  Ankunfts-/Abflugtafel und arbeitet nur noch mit
  `sensor.flightradar24_airport_arrivals` / `_departures`. Die Sensoren der
  Integration selbst sind davon nicht betroffen und bleiben anderweitig
  nutzbar.
- Konfigurationsoption `mode` (`auto`/`airport`/`area`) – ohne zweiten
  Sensor-Typ gibt es nichts mehr zu unterscheiden.
- Konfigurationsoptionen `visible_fields.altitude` und `visible_fields.speed`
  – die Airport-Sensoren liefern diese Werte nicht, die Spalten blieben
  immer leer.

### Geändert
- Die Entity-Auswahl im visuellen Editor listet nur noch Sensoren mit
  `flights`-Attribut, also keine Statistik-Sensoren wie
  `..._delayed` oder `..._on_time` mehr.

## [0.2.0] - 2026-02-06

### Hinzugefügt
- Unterstützung für neue Airport Arrivals/Departures Sensoren
- Automatische Erkennung des Sensor-Typs (Airport vs. Area)
- Neue `mode` Option für manuelle Sensor-Typ-Auswahl
- Bessere Handhabung von `status_text` aus Airport Sensoren
- Unterstützung für `airport_city` Feld
- MIGRATION.md für Wechsel von Markdown Card

### Geändert
- Verbesserte Auto-Detection zwischen Airport- und Area-Sensoren
- Optimierte Datenformatierung je nach Sensor-Typ

## [0.1.0] - 2026-02-06

### Hinzugefügt
- Initiale Veröffentlichung
- Split-Flap-Display-Animation mit authentischem Look
- Unterstützung für FlightRadar24 Integration Area-Sensoren
- Konfigurierbare Animationsgeschwindigkeit (`flip_duration`)
- Konfigurierbare Verzögerung zwischen Buchstaben (`flip_delay`)
- Konfigurierbare Anzahl anzuzeigender Flüge (`max_flights`)
- Anpassbarer Titel (`title`)
- Automatische Erkennung und Animation nur bei geänderten Daten
- Intelligente Formatierung für:
  - Ankunftszeiten
  - Flugnummern
  - Abflughäfen
  - Flugstatus (GELANDET, ERWARTET, Verspätungen)
  - Flugzeugtypen
- Dunkles, realistisches Design mit:
  - Farbverläufen auf den Flip-Klappen
  - Schatten und 3D-Effekt
  - Horizontale Trennlinie auf jeder Klappe
  - Helligkeitseffekte während der Animation
- HACS-Unterstützung
- Deutsche Lokalisierung
- Umfangreiche Dokumentation

### Technische Details
- Custom Element: `flightradar24-splitflap-card`
- Shadow DOM für gekapselte Styles
- CSS-Animationen für Performance
- Ereignisbasierte Updates (keine Polling)
- Optimierte Render-Performance durch selektive Updates

[Unreleased]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/0.5.0...HEAD
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
