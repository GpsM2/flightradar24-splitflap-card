/**
 * Guards the two i18n invariants that are easy to break by hand:
 *
 * 1. The English fallback bundled in the card must stay identical to
 *    translations/en.json — otherwise the card would show one set of strings
 *    before the fetch resolves and another afterwards.
 * 2. Every shipped language must define exactly the same keys as English,
 *    so no language silently falls back for individual strings.
 */
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// The card is a browser module: it subclasses HTMLElement and registers
// custom elements at import time. Stub just enough of the DOM for Node to
// evaluate it, so this check reads the real exported value rather than a
// copy that could itself drift.
globalThis.HTMLElement = class {};
globalThis.customElements = { define() {} };
globalThis.window = globalThis;

const { FALLBACK_TRANSLATIONS } =
  await import('../dist/flightradar24-splitflap-card.js');

const dir = fileURLToPath(new URL('../dist/translations/', import.meta.url));

/** @param {string} lang */
const load = async lang =>
  JSON.parse(await readFile(new URL(`../dist/translations/${lang}.json`, import.meta.url), 'utf8'));

const errors = [];

const en = await load('en');
const enKeys = Object.keys(en).sort();

for (const key of enKeys) {
  if (FALLBACK_TRANSLATIONS[key] !== en[key]) {
    errors.push(
      `FALLBACK_TRANSLATIONS.${key} is ${JSON.stringify(FALLBACK_TRANSLATIONS[key])}, ` +
      `translations/en.json has ${JSON.stringify(en[key])}`
    );
  }
}
for (const key of Object.keys(FALLBACK_TRANSLATIONS)) {
  if (!(key in en)) errors.push(`FALLBACK_TRANSLATIONS.${key} is missing from translations/en.json`);
}

const files = (await readdir(dir)).filter(name => name.endsWith('.json'));
for (const file of files) {
  const lang = file.replace(/\.json$/, '');
  if (lang === 'en') continue;

  const strings = await load(lang);
  for (const key of enKeys) {
    if (!(key in strings)) errors.push(`${file}: missing key "${key}"`);
  }
  for (const key of Object.keys(strings)) {
    if (!(key in en)) errors.push(`${file}: unknown key "${key}" (not in en.json)`);
  }
}

if (errors.length) {
  console.error('i18n check failed:\n' + errors.map(e => `  - ${e}`).join('\n'));
  process.exit(1);
}

console.log(`i18n check passed: ${files.length} languages, ${enKeys.length} keys each`);
