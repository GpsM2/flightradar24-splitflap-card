# Installation & Einrichtung

## Schritt 1: Voraussetzungen prüfen

### FlightRadar24 Integration installieren

Diese Card benötigt die [FlightRadar24 Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24).

Falls noch nicht installiert:

1. HACS öffnen
2. Nach "FlightRadar24" suchen
3. Integration installieren
4. Home Assistant neu starten
5. Integration konfigurieren (Einstellungen → Geräte & Dienste → Integration hinzufügen)

## Schritt 2: Split-Flap Card installieren

### Via HACS (empfohlen)

1. HACS öffnen
2. Auf "Frontend" klicken
3. Drei-Punkte-Menü oben rechts → "Benutzerdefinierte Repositories"
4. Repository-URL hinzufügen:
   ```
   https://github.com/GpsM2/flightradar24-splitflap-card
   ```
5. Kategorie: "Lovelace" auswählen
6. "Hinzufügen" klicken
7. Nach "FlightRadar24 Split-Flap Card" suchen
8. Installieren
9. Browser-Cache leeren (Strg+F5)

### Manuelle Installation

1. [Neueste Release](https://github.com/GpsM2/flightradar24-splitflap-card/releases) herunterladen
2. Den gesamten Inhalt des `dist`-Ordners nach
   `/config/www/flightradar24-splitflap-card/` kopieren (die JS-Datei und den
   Ordner `translations/`)
3. In Home Assistant:
   - **Einstellungen** → **Dashboards**
   - Drei-Punkte-Menü → **Ressourcen**
   - **Ressource hinzufügen**
   - URL: `/local/flightradar24-splitflap-card/flightradar24-splitflap-card.js`
   - Typ: **JavaScript-Modul**
   - Speichern
4. Browser-Cache leeren (Strg+F5)

## Schritt 3: Card zum Dashboard hinzufügen

### Über die UI

1. Dashboard bearbeiten
2. "Karte hinzufügen"
3. Runterscrollen zu "Manuell" oder "Custom: FlightRadar24 Split-Flap Card"
4. Folgende Konfiguration einfügen:

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
```

5. Speichern

### Via YAML

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE
max_flights: 8
flip_duration: 800
flip_delay: 50
```

## Schritt 4: Konfiguration anpassen

### Verfügbare Entities

Diese Card ist eine Ankunfts-/Abflugtafel und unterstützt die beiden Airport-Sensoren:

```yaml
# Ankünfte
entity: sensor.flightradar24_airport_arrivals

# Abflüge
entity: sensor.flightradar24_airport_departures
```

Die Area-Sensoren der Integration (`current_in_area`, `entered_area`, `exited_area`,
`additional_tracked`) werden von dieser Card nicht unterstützt – sie liefern
Live-Positionsdaten statt Fahrplandaten. Die Sensoren selbst bleiben unverändert
nutzbar, nur eben in anderen Karten.

### Animations-Geschwindigkeit anpassen

**Schnelle Animation:**
```yaml
flip_duration: 400
flip_delay: 25
```

**Standard:**
```yaml
flip_duration: 800
flip_delay: 50
```

**Langsam & dramatisch:**
```yaml
flip_duration: 1500
flip_delay: 120
```

### Anzahl der Flüge

```yaml
# Kompakt
max_flights: 4

# Standard
max_flights: 8

# Viele Flüge
max_flights: 15
```

## Erweiterte Konfigurationen

### Mehrere Tafeln kombinieren

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
    max_flights: 3
    flip_duration: 600
```

### Mit Bedingungen

Zeige die Card nur wenn Flüge vorhanden sind:

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

### Vollbild-Ansicht

Perfekt für Tablets oder dedizierte Displays:

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE FRANKFURT
max_flights: 12
flip_duration: 1000
flip_delay: 80
```

## Problembehandlung

### Card erscheint nicht

**Prüfe die Browser-Konsole** (F12):

- Gibt es JavaScript-Fehler?
- Wurde die Ressource geladen?

**Lösung:**
1. Browser-Cache leeren (Strg+F5)
2. Home Assistant neu starten
3. Ressource neu hinzufügen

### Keine Daten sichtbar

**Prüfe den Sensor:**

1. **Entwicklerwerkzeuge** → **Zustände**
2. Suche nach `sensor.flightradar24_airport_arrivals`
3. Prüfe ob `flights` Attribut Daten enthält

**Mögliche Ursachen:**
- Aktuell keine Flüge für diesen Flughafen gemeldet
- FlightRadar24 Integration nicht korrekt konfiguriert
- Kein Flughafen in der Integration hinterlegt

### Animation ruckelt

**Reduziere die Anzahl der Flüge:**
```yaml
max_flights: 4
```

**Oder verlängere das Update-Intervall:**

In der FlightRadar24 Integration:
- Einstellungen → Geräte & Dienste → FlightRadar24
- Scan-Interval auf mindestens 60 Sekunden erhöhen

### Falsche Daten

**Cache-Problem:**
1. Browser-Cache komplett leeren
2. Home Assistant neu starten
3. In Inkognito-Modus testen

## Optimale Einstellungen

### Für Realismus

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE
max_flights: 8
flip_duration: 800    # Echte Tafeln sind etwa so schnell
flip_delay: 60        # Schöner Welleneffekt
```

### Für Performance

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: FLÜGE
max_flights: 5        # Weniger Flüge = besser Performance
flip_duration: 600    # Schnellere Animation
flip_delay: 30
```

### Für große Displays

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_airport_arrivals
title: ANKÜNFTE MONITOR
max_flights: 15
flip_duration: 1000
flip_delay: 100
```

## Tipps & Tricks

1. **Update-Interval der Integration anpassen**  
   60-120 Sekunden sind optimal für die Animation

2. **Mehrere Regionen überwachen**  
   Erstelle mehrere FlightRadar24 Geräte für verschiedene Flughäfen

3. **Automationen nutzen**  
   Sende Benachrichtigungen wenn neue Flüge erscheinen

4. **Theme anpassen**  
   Die Card passt sich automatisch an dein Theme an

5. **Mobile Optimierung**  
   Auf Smartphones `max_flights: 4` verwenden

## Support

Bei Problemen:

1. [Issues auf GitHub](https://github.com/GpsM2/flightradar24-splitflap-card/issues) durchsuchen
2. Neues Issue erstellen mit:
   - Home Assistant Version
   - Browser & Version
   - Fehlermeldungen aus der Konsole
   - Deine Konfiguration (ohne sensible Daten)

## Weiterführende Links

- [FlightRadar24 Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24)
- [Home Assistant Lovelace Dokumentation](https://www.home-assistant.io/lovelace/)
- [HACS Dokumentation](https://hacs.xyz/)
