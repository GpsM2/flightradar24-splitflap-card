# FlightRadar24 Split-Flap Card

Eine Custom Lovelace Card für Home Assistant, die Flugdaten im Stil einer klassischen Flughafen-Anzeigetafel mit animierten Split-Flap-Displays darstellt.

## Features

- 🎯 Authentische Split-Flap-Animation
- 🔄 Intelligente Updates (nur geänderte Zeichen werden animiert)
- 📊 Übersichtliche Darstellung aller Flugdaten
- 🎨 Realistisches dunkles Design
- ⚙️ Voll konfigurierbar

## Voraussetzungen

Diese Card benötigt die [FlightRadar24 Integration](https://github.com/AlexandrErohin/home-assistant-flightradar24).

## Schnellstart

Karte über die Oberfläche hinzufügen: Dashboard bearbeiten →
**Karte hinzufügen** → nach „FlightRadar24 Split-Flap Card" suchen → Sensor
auswählen. YAML ist nicht nötig.

Zur Auswahl stehen nur die Ankunfts- und Abflugtafeln der FlightRadar24-
Integration.

## Konfiguration

Alle Optionen stehen im visuellen Editor: Titel, Sprache, Anzahl der Flüge,
Richtung der Tafel, helles/dunkles Erscheinungsbild, Animationsgeschwindigkeit
und die sichtbaren Spalten.

> Mehrere Tafeln bitte als **eigene Karten** einfügen, nicht über eine
> Stapel-Karte kombinieren – sonst berechnet Home Assistant die Höhe falsch.

## Unterstützung

Bei Problemen oder Fragen erstelle bitte ein [Issue auf GitHub](https://github.com/GpsM2/flightradar24-splitflap-card/issues).
