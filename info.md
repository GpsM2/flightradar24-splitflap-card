# FlightRadar24 Split-Flap Card

An animated split-flap airport board for Home Assistant.

## Features

- Authentic split-flap animation
- Arrivals and departures for an airport
- Delay indicator with colour-coded status
- Light and dark mode
- Visual configuration editor

## Requirements

This card needs the
[FlightRadar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24).

## Getting started

Add the card through the interface: edit the dashboard → **Add card** → search
for "FlightRadar24 Split-Flap Card" → pick the sensor. No YAML needed.

Only the FlightRadar24 arrivals and departures boards are offered.

## Configuration

Every option is available in the visual editor: title, language, number of
flights, board direction, light/dark appearance, accent colour, edge bars,
animation style and the visible columns.

> Add multiple boards as **separate cards** rather than combining them in a
> stack card — otherwise Home Assistant calculates the height incorrectly.

## Support

For problems or questions, please open an
[issue on GitHub](https://github.com/GpsM2/flightradar24-splitflap-card/issues).
