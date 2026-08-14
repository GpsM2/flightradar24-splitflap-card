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

Die Karte wird über die Oberfläche eingerichtet – YAML ist nicht nötig.

1. Dashboard bearbeiten → **Karte hinzufügen**
2. Nach „FlightRadar24 Split-Flap Card" suchen und auswählen
3. Im Editor den gewünschten Sensor wählen. Zur Auswahl stehen nur die
   Ankunfts- und Abflugtafeln – die Area- und Statistik-Sensoren der
   Integration werden ausgeblendet, weil sie keine Fahrplandaten liefern.
4. Optionen anpassen und speichern

Ab Home Assistant 2026.6 geht es noch direkter: beim Hinzufügen einer Karte
zuerst den Sensor auswählen – diese Karte wird dann automatisch vorgeschlagen.

## Schritt 4: Optionen anpassen

Alle Optionen stehen im visuellen Editor. Die YAML-Namen dienen nur als
Referenz, etwa zum Nachschlagen im Code-Editor:

| Option | Standard | Bedeutung |
|---|---|---|
| `entity` | – | Ankunfts- oder Abflug-Sensor (erforderlich) |
| `title` | automatisch | Überschrift; leer = Richtung der Tafel |
| `language` | Sprache von HA | `en`, `de`, `es`, `fr` |
| `max_flights` | `8` | Anzahl angezeigter Flüge (1–20) |
| `board` | `auto` | `auto`, `arrivals`, `departures` |
| `theme` | `auto` | `auto`, `dark`, `light` |
| `flip_duration` | `800` | Dauer der Flip-Animation (ms) |
| `flip_delay` | `50` | Verzögerung zwischen Zeichen (ms) |
| `visible_fields` | alle | Sichtbare Spalten |

### Unterstützte Sensoren

- `sensor.flightradar24_airport_arrivals` – Ankunft eines Flughafens
- `sensor.flightradar24_airport_departures` – Abflug eines Flughafens

Die Area-Sensoren der Integration (`current_in_area`, `entered_area`,
`exited_area`, `additional_tracked`) werden von dieser Card nicht unterstützt –
sie liefern Live-Positionsdaten statt Fahrplandaten. Die Sensoren selbst
bleiben unverändert nutzbar, nur eben in anderen Karten.

### Ankunft und Abflug zusammen anzeigen

Beide Tafeln jeweils als **eigene Karte** hinzufügen und im Dashboard
untereinander anordnen.

> **Nicht** über eine Stapel-Karte (`vertical-stack`, `grid`, …) kombinieren:
> Eine Stapel-Karte meldet Home Assistant ihre eigene Größe für die ganze
> Gruppe, wodurch die Höhe der enthaltenen Tafeln nicht mehr richtig berechnet
> wird und der Abschnitt in den darunterliegenden überläuft.

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

**Karte läuft in den darunterliegenden Abschnitt über**

Tritt auf, wenn die Karte in einer Stapel-Karte steckt. Jede Tafel als eigene
Karte einfügen.

**Mögliche Ursachen:**
- Aktuell keine Flüge für diesen Flughafen gemeldet
- FlightRadar24 Integration nicht korrekt konfiguriert
- Kein Flughafen in der Integration hinterlegt

### Animation ruckelt

**Reduziere die Anzahl der Flüge** im Editor (Option „Maximale Anzahl Flüge").

**Oder verlängere das Update-Intervall:**

In der FlightRadar24 Integration:
- Einstellungen → Geräte & Dienste → FlightRadar24
- Scan-Interval auf mindestens 60 Sekunden erhöhen

### Falsche Daten

**Cache-Problem:**
1. Browser-Cache komplett leeren
2. Home Assistant neu starten
3. In Inkognito-Modus testen

## Empfohlene Einstellungen

Alles davon im visuellen Editor einstellbar.

| Einsatz | Anzahl Flüge | Dauer der Animation | Verzögerung |
|---|---|---|---|
| Realistisch | 8 | 800 ms – echte Tafeln sind etwa so schnell | 60 ms |
| Schwächere Geräte | 5 | 600 ms | 30 ms |
| Große Displays | 15 | 1000 ms | 100 ms |
| Smartphone | 4 | 800 ms | 50 ms |

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
   Auf Smartphones weniger Flüge anzeigen lassen

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
