# Beitragen zum Projekt

Vielen Dank für dein Interesse, zu diesem Projekt beizutragen! 🎉

## Wie kann ich beitragen?

### Bug Reports

Wenn du einen Bug gefunden hast:

1. Prüfe ob das Problem bereits als [Issue](https://github.com/GpsM2/flightradar24-splitflap-card/issues) existiert
2. Falls nicht, erstelle ein neues Issue mit:
   - Beschreibung des Problems
   - Schritte zur Reproduktion
   - Erwartetes vs. tatsächliches Verhalten
   - Screenshots (falls relevant)
   - Home Assistant Version
   - Browser & Version
   - Deine Konfiguration (ohne sensible Daten)

### Feature Requests

Für neue Features:

1. Prüfe ob es bereits einen Request gibt
2. Erstelle ein Issue mit:
   - Beschreibung des gewünschten Features
   - Warum es nützlich wäre
   - Beispiel-Konfiguration (falls relevant)

### Pull Requests

1. Forke das Repository
2. Erstelle einen Branch für deine Änderung (`git checkout -b feature/amazing-feature`)
3. Committe deine Änderungen (`git commit -m 'Add amazing feature'`)
4. Pushe den Branch (`git push origin feature/amazing-feature`)
5. Öffne einen Pull Request

#### Code-Style

- Verwende 2 Spaces für Einrückung
- Kommentiere komplexen Code
- Teste deine Änderungen gründlich
- Aktualisiere die Dokumentation bei Bedarf

#### Testing

Teste deine Änderungen mit:
- Verschiedenen Browsern (Chrome, Firefox, Safari)
- Mobile und Desktop
- Verschiedenen FlightRadar24 Sensoren
- Verschiedenen Anzahlen von Flügen

## Entwicklungsumgebung

### Setup

1. Forke und klone das Repository
2. Erstelle einen Symlink nach Home Assistant:
   ```bash
   ln -s /pfad/zum/repo/flightradar24-splitflap-card.js /pfad/zu/homeassistant/www/
   ```
3. Füge die Ressource in Home Assistant hinzu
4. Entwickle mit aktiviertem Browser-Cache-Disable

### Live-Reload

Für schnellere Entwicklung:

1. Öffne die Browser DevTools (F12)
2. Gehe zu Network → Disable cache (bei geöffneten DevTools)
3. Änderungen an der JS-Datei
4. Seite neu laden

### Debugging

- Browser Console nutzen für JavaScript-Fehler
- `console.log()` für Debugging
- Home Assistant Logs für Backend-Fehler

## Dokumentation

Bei Änderungen bitte aktualisieren:

- `README.md` - Hauptdokumentation
- `INSTALLATION.md` - Installationsanleitung
- `CHANGELOG.md` - Liste der Änderungen
- `info.md` - HACS Info
- Inline-Kommentare im Code

## Versions-Schema

Wir folgen [Semantic Versioning](https://semver.org/):

- **MAJOR** - Inkompatible API-Änderungen
- **MINOR** - Neue Features (abwärtskompatibel)
- **PATCH** - Bug Fixes

## Code of Conduct

Sei respektvoll und konstruktiv. Wir wollen eine einladende Community für alle.

## Lizenz

Durch deine Beiträge stimmst du zu, dass deine Arbeit unter der [MIT Lizenz](LICENSE) lizenziert wird.

## Fragen?

Bei Fragen erstelle ein Issue oder kontaktiere die Maintainer.

Danke für deine Unterstützung! 🙏
