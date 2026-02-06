# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/lang/de/).

## [Unreleased]

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

[Unreleased]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/GpsM2/flightradar24-splitflap-card/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/GpsM2/flightradar24-splitflap-card/releases/tag/v0.1.0
