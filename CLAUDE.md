# CLAUDE.md

## Project

FlightRadar24 Split-Flap Card — a custom Lovelace card for Home Assistant that
renders flight data from the [FlightRadar24 integration](https://github.com/AlexandrErohin/home-assistant-flightradar24)
as an animated split-flap airport display. Distributed via HACS (Lovelace/plugin
category). Pure frontend: one vanilla JS custom element (`HTMLElement`, Shadow
DOM), no backend/Python component, no bundler today.

Goal: bring this card to a standard suitable for the official HACS default
store — clean i18n, tested behavior, a disciplined release process.

## Collaboration rules (no exceptions)

- Never commit directly to `main`. For every non-trivial change, create a
  branch (`git checkout -b <short-name>`) and open a Pull Request.
- Work is tracked via GitHub Issues, and issues are labeled. An issue may
  only be created after explicit maintainer go-ahead in chat. The maintainer
  may also explicitly waive the issue for a specific small/foundational
  change ("ohne Issue erledigen") — that still requires a branch + PR, just
  skips the issue step.
- Never create a GitHub Release without explicit go-ahead from the
  maintainer in chat first.
- Every release ships as a beta/pre-release first. The maintainer tests it
  manually; only promote to a final release after explicit confirmation.
- Before a larger refactor (architecture changes, e.g. introducing a build
  step or restructuring translations), present a short plan and get
  explicit confirmation before touching code.
- Commit messages explain *why*, not just *what*.
- Release notes include a screenshot/GIF whenever the change affects
  visual appearance. Claude produces screenshots/GIFs itself (in-browser),
  the maintainer does not supply them.
- Chat with the maintainer: German. Everything that lands in the repo
  (code, comments, commit messages, PR/issue text, docs): English.

## Labels

- `bug` — something is broken.
- `enhancement` — new feature or improvement.
- `documentation` — README/INSTALLATION/CHANGELOG/info.md work.
- `i18n` — translations, hardcoded text, `translations/*.json`, language
  fallback logic. Not for pure layout/visual changes (use `design`).
- `design` — visual design, layout, theming.
- `tooling` — dev tooling, linting, type-checking, CI.
- `hacs` — HACS packaging, publishing, store-readiness.
- `needs-decision` — requires a maintainer decision before work starts.

## Versioning

This is a Lovelace card, not a HA integration — there is no `manifest.json`.
Version of record:
- `CARD_VERSION` constant at the top of `flightradar24-splitflap-card.js`,
  logged to the console on load.
- The matching git tag on release (`vX.Y.Z` final, `vX.Y.Z-beta.N` pre-release).
Bump `CARD_VERSION` (patch by default, e.g. 0.2.3 → 0.2.4) only for actual
functional changes — never for README/docs-only edits.

## Code quality gates (JS equivalent of ruff/mypy)

No Python code exists in this repo, so ruff/mypy don't apply directly.
Equivalent gates before merging any PR:
- `eslint` clean (lint).
- `tsc --noEmit --checkJs` clean, using JSDoc type annotations for type
  safety — no TypeScript migration, no runtime build step added.
- Both wired into GitHub Actions CI, required to pass before merge.
A minimal `package.json` holds ESLint + TypeScript as devDependencies only;
the shipped `flightradar24-splitflap-card.js` itself stays plain,
dependency-free JS — HACS still just serves the raw file.

## Internationalization

- No hardcoded UI text anywhere — including the visual card AND the config
  editor UI.
- All strings live under `translations/<lang>.json`, loaded at runtime
  relative to the module (`import.meta.url`), with `en` bundled inline as
  fallback so the card never flashes blank/broken text before the fetch
  resolves.
- Dynamically composed strings (e.g. "+12 MIN", "…ft", "…kts") are built
  from translation templates/placeholders — never a hardcoded unit or word
  concatenated onto a number.
- Default language: fall back to Home Assistant's own UI language
  (`hass.locale.language`) when no explicit `language` is set in the card
  config; fall back further to English if unsupported.
- New languages/keys can be drafted plausibly by Claude; native-speaker
  review happens later, on demand, not as a blocker.

## Testing

- Claude tests the card itself (behavior + visuals) before calling any
  change done — against the maintainer's production Home Assistant
  instance via the REST API (URL + read-only long-lived access token,
  provided out-of-band, never committed to the repo).
- Read-only in practice: only GET requests against the HA API, never
  service calls or state changes.
- Cover: sensor modes actually in scope (see area-mode scope decision),
  missing/`unavailable` entity, empty flight list, long field values
  (truncation), light/dark HA themes.
- No UI/frontend change counts as "done" without being exercised in a
  browser, not just read.

## Documentation upkeep

On behavior changes, update `README.md`, `INSTALLATION.md`,
`CHANGELOG.md`, `info.md`. Keep German user-facing docs and English
in-repo dev text consistent in substance.
