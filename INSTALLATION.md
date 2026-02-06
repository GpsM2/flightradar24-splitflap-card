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
2. `flightradar24-splitflap-card.js` nach `/config/www/` kopieren
3. In Home Assistant:
   - **Einstellungen** → **Dashboards**
   - Drei-Punkte-Menü → **Ressourcen**
   - **Ressource hinzufügen**
   - URL: `/local/flightradar24-splitflap-card.js`
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
entity: sensor.flightradar24_current_in_area
```

5. Speichern

### Via YAML

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_current_in_area
title: ANKÜNFTE
max_flights: 8
flip_duration: 800
flip_delay: 50
```

## Schritt 4: Konfiguration anpassen

### Verfügbare Entities

Teste verschiedene Sensoren:

```yaml
# Flüge in der Nähe
entity: sensor.flightradar24_current_in_area

# Neu eingetretene Flüge
entity: sensor.flightradar24_entered_area

# Kürzlich ausgetretene Flüge
entity: sensor.flightradar24_exited_area

# Manuell verfolgte Flüge
entity: sensor.flightradar24_additional_tracked
```

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
    entity: sensor.flightradar24_current_in_area
    title: AKTUELL IN DER NÄHE
    max_flights: 5
    
  - type: custom:flightradar24-splitflap-card
    entity: sensor.flightradar24_entered_area
    title: KÜRZLICH EINGETRETEN
    max_flights: 3
    flip_duration: 600
```

### Mit Bedingungen

Zeige die Card nur wenn Flüge vorhanden sind:

```yaml
type: conditional
conditions:
  - condition: numeric_state
    entity: sensor.flightradar24_current_in_area
    above: 0
card:
  type: custom:flightradar24-splitflap-card
  entity: sensor.flightradar24_current_in_area
  title: ANKÜNFTE
```

### Vollbild-Ansicht

Perfekt für Tablets oder dedizierte Displays:

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_current_in_area
title: FLUGHAFEN FRANKFURT
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
2. Suche nach `sensor.flightradar24_current_in_area`
3. Prüfe ob `flights` Attribut Daten enthält

**Mögliche Ursachen:**
- Keine Flüge in der Nähe
- FlightRadar24 Integration nicht korrekt konfiguriert
- Radius zu klein eingestellt

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
entity: sensor.flightradar24_current_in_area
title: ANKÜNFTE
max_flights: 8
flip_duration: 800    # Echte Tafeln sind etwa so schnell
flip_delay: 60        # Schöner Welleneffekt
```

### Für Performance

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_current_in_area
title: FLÜGE
max_flights: 5        # Weniger Flüge = besser Performance
flip_duration: 600    # Schnellere Animation
flip_delay: 30
```

### Für große Displays

```yaml
type: custom:flightradar24-splitflap-card
entity: sensor.flightradar24_current_in_area
title: FLUGHAFEN MONITOR
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
