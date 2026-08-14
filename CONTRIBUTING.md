# Contributing

Thanks for your interest in contributing to this project.

## How can I contribute?

### Bug reports

If you found a bug:

1. Check whether it already exists as an
   [issue](https://github.com/GpsM2/flightradar24-splitflap-card/issues)
2. If not, open a new issue with:
   - A description of the problem
   - Steps to reproduce
   - Expected vs. actual behaviour
   - Screenshots (if relevant)
   - Home Assistant version
   - Browser and version
   - Your configuration (without sensitive data)

### Feature requests

For new features:

1. Check whether a request already exists
2. Open an issue with:
   - A description of the feature
   - Why it would be useful
   - An example configuration (if relevant)

### Pull requests

1. Fork the repository
2. Create a branch for your change (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push the branch (`git push origin feature/amazing-feature`)
5. Open a pull request

Direct pushes to `main` are blocked by a repository ruleset — a pull request is
required, and the `lint-and-typecheck` check has to pass before it can be
merged.

#### Quality gates

Before opening a pull request:

```bash
npm install
npm run lint          # ESLint
npm run typecheck     # tsc --checkJs, via JSDoc annotations
npm run check:i18n    # translation invariants
```

All three run in CI on every pull request.

#### Code style

- 2 spaces for indentation
- Comment code whose reason isn't obvious from reading it
- Test your changes thoroughly
- Update the documentation where needed

#### Testing

Test your changes against:
- Several browsers (Chrome, Firefox, Safari)
- Mobile and desktop
- Both arrivals and departures sensors
- Different numbers of flights
- Light and dark mode

## Project layout

Everything shipped to users lives in `dist/`:

```
dist/
  flightradar24-splitflap-card.js
  translations/{en,de,es,fr}.json
  fonts/JetBrainsMono-Bold-subset.woff2
```

HACS delivers that whole folder. Files in the repository root (`README.md`,
`package.json`, `scripts/`, …) are development-only and are not delivered.

## Translations

All user-visible text lives in `dist/translations/<language>.json` — the board's
own vocabulary and the configuration editor alike. Adding a language needs no
JavaScript change beyond listing it in `SUPPORTED_LANGUAGES`.

Two invariants are enforced by `npm run check:i18n`:

- the English fallback bundled in the card stays identical to
  `translations/en.json`
- every language defines exactly the same keys

Composed strings (for example `+8 MIN`) are built from templates with
placeholders, never by concatenating a unit onto a number.

## Documentation

Please update, where relevant:

- `README.md` — main documentation
- `INSTALLATION.md` — installation guide
- `CHANGELOG.md` — list of changes
- `info.md` — HACS info
- Inline comments in the code

Everything in this repository is written in English.

## Versioning

We follow [Semantic Versioning](https://semver.org/), without a `v` prefix on
tags or milestones:

- **MAJOR** — incompatible API changes
- **MINOR** — new features (backwards compatible)
- **PATCH** — bug fixes

Before 1.0.0 a backwards-incompatible change bumps MINOR rather than MAJOR.

`CARD_VERSION` at the top of the card file is the version of record and is
logged to the browser console on load. Bump it only for actual functional
changes, never for documentation-only edits.

Every release ships as a pre-release first and is promoted to final only after
testing.

## Code of conduct

Be respectful and constructive. We want a welcoming community for everyone.

## Licence

By contributing you agree that your work is licensed under the
[MIT licence](LICENSE).

## Questions?

Open an issue or contact the maintainer.
