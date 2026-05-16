#!/usr/bin/env node

/**
 * Translation Checker for Morphe
 *
 * Checks for:
 * - Missing translations
 * - Zombie keys (keys in JSON but not in HTML)
 * - Untranslated strings (same as English)
 * - Translation completeness percentage
 *
 * Usage: node scripts/check-translations.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = 'public/locales';
const BASE_LOCALE = 'en';

// Keys whose values are intentionally identical across all locales (e.g. brand names).
// Excluded from "untranslated" warnings in completeness check.
const SKIP_KEYS = new Set([
  'hero.title-highlight-youtube',
  'hero.title-highlight-ytmusic',
  'hero.title-highlight-reddit',
  'app-features.tab-youtube',     // product name
  'app-features.tab-ytmusic',     // product name
  'app-features.tab-reddit',      // product name
  'app-features.sponsorblock',    // brand name
  'nav.faq',                      // universal abbreviation
  'changelog.filter-manager',     // app name
  'changelog.filter-patches',     // technical term
]);

/**
 * Load all locale files
 */
function loadLocales() {
  const locales = {};
  const files = fs.readdirSync(LOCALES_DIR)
    .filter(f => f.endsWith('.json') && f !== 'supported-locales.json');

  files.forEach(file => {
    const code = path.basename(file, '.json');
    const content = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8');
    try {
      locales[code] = JSON.parse(content);
    } catch (error) {
      console.error(`Error parsing ${file}:`, error.message);
    }
  });

  return locales;
}

/**
 * Get all keys from nested object
 */
function getAllKeys(obj, prefix = '') {
  let keys = [];

  if (!obj || typeof obj !== 'object') return keys;

  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (obj[key] === null) {
      // null = manually managed key (e.g. data-i18n-link/links) — skip entirely
    } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  });

  return keys;
}

/**
 * Get value by dotted key path
 */
function getValue(obj, keyPath) {
  const keys = keyPath.split('.');
  let value = obj;

  for (const key of keys) {
    if (value !== null && value !== undefined && typeof value === 'object') {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * Check translation completeness
 * Ignores testimonials section
 */
function checkCompleteness(locales) {
  const baseKeys = getAllKeys(locales[BASE_LOCALE]).filter(key => !key.startsWith('testimonials.'));
  const results = {};

  Object.keys(locales).forEach(locale => {
    if (locale === BASE_LOCALE) return;

    const localeKeys = getAllKeys(locales[locale]).filter(key => !key.startsWith('testimonials.'));
    const missing = baseKeys.filter(key => !localeKeys.includes(key));
    const missingKeys = new Set(missing);
    const untranslated = baseKeys.filter(key => {
      if (missingKeys.has(key)) return false;
      if (SKIP_KEYS.has(key)) return false;
      const baseValue = getValue(locales[BASE_LOCALE], key);
      const localeValue = getValue(locales[locale], key);

      if (localeValue !== baseValue) return false;

      // Strings that are identical to English are only flagged if they are long enough
      // to likely be sentences/paragraphs rather than common terms or brand names.
      // Short strings (e.g. "Home", "Community", "Product") are often intentionally identical.
      return baseValue.length > 20;
    });

    const total = baseKeys.length;
    const translated = total - missing.length - untranslated.length;

    // 100% is only for actual perfection. Any missing/untranslated string caps at 99%.
    const percentage = (missing.length === 0 && untranslated.length === 0)
      ? 100
      : Math.min(99, Math.floor((translated / total) * 100));

    results[locale] = {
      total,
      translated,
      missing: missing.length,
      untranslated: untranslated.length,
      percentage,
      missingKeys: missing,
      untranslatedKeys: untranslated
    };
  });

  return results;
}

/**
 * Find zombie keys (in locale but not in base)
 * Ignores testimonials section
 */
function findZombieKeys(locales) {
  const baseKeys = getAllKeys(locales[BASE_LOCALE]).filter(key => !key.startsWith('testimonials.'));
  const zombies = {};

  Object.keys(locales).forEach(locale => {
    if (locale === BASE_LOCALE) return;

    const localeKeys = getAllKeys(locales[locale]).filter(key => !key.startsWith('testimonials.'));
    const zombieKeys = localeKeys.filter(key => !baseKeys.includes(key));

    if (zombieKeys.length > 0) {
      zombies[locale] = zombieKeys;
    }
  });

  return zombies;
}

/**
 * Generate report
 */
function generateReport(locales) {
  console.log('='.repeat(60));
  console.log('MORPHE TRANSLATION REPORT');
  console.log('='.repeat(60));
  console.log();

  // Base locale info
  const baseKeys = getAllKeys(locales[BASE_LOCALE]).filter(key => !key.startsWith('testimonials.'));
  console.log(`Base locale (${BASE_LOCALE}): ${baseKeys.length} strings`);
  console.log('(testimonials excluded from count)\n');

  // Completeness check
  console.log('TRANSLATION COMPLETENESS:');
  console.log('-'.repeat(60));

  const completeness = checkCompleteness(locales);
  const sortedLocales = Object.keys(completeness).sort();

  const complete = [];
  const incomplete = [];

  sortedLocales.forEach(locale => {
    if (completeness[locale].percentage === 100) {
      complete.push(locale);
    } else {
      incomplete.push(locale);
    }
  });

  if (complete.length > 0) {
    console.log(`✓ 100% Complete: ${complete.join(', ')}`);
    console.log();
  }

  if (incomplete.length > 0) {
    incomplete.forEach(locale => {
      const data = completeness[locale];
      console.log(`${locale.padEnd(8)} ${data.percentage}% complete`);
      console.log(`         ${data.translated}/${data.total} translated, ${data.missing} missing, ${data.untranslated} untranslated`);

      if (data.missingKeys.length > 0 && data.missingKeys.length <= 10) {
        console.log(`         Missing: ${data.missingKeys.join(', ')}`);
      } else if (data.missingKeys.length > 10) {
        console.log(`         Missing: ${data.missingKeys.slice(0, 5).join(', ')} ... and ${data.missingKeys.length - 5} more`);
      }
      if (data.untranslatedKeys.length > 0 && data.untranslatedKeys.length <= 10) {
        console.log(`         Untranslated: ${data.untranslatedKeys.join(', ')}`);
      } else if (data.untranslatedKeys.length > 10) {
        console.log(`         Untranslated: ${data.untranslatedKeys.slice(0, 5).join(', ')} ... and ${data.untranslatedKeys.length - 5} more`);
      }
      console.log();
    });
  }

  // Zombie keys check
  const zombies = findZombieKeys(locales);
  if (Object.keys(zombies).length > 0) {
    console.log('ZOMBIE KEYS (in locale but not in base):');
    console.log('-'.repeat(60));

    Object.keys(zombies).forEach(locale => {
      console.log(`${locale}: ${zombies[locale].length} zombie key(s)`);
      if (zombies[locale].length <= 10) {
        zombies[locale].forEach(key => console.log(`  - ${key}`));
      } else {
        zombies[locale].slice(0, 5).forEach(key => console.log(`  - ${key}`));
        console.log(`  ... and ${zombies[locale].length - 5} more`);
      }
      console.log();
    });
  } else {
    console.log('✓ No zombie keys found\n');
  }

  // Summary
  console.log('='.repeat(60));
  const completions = Object.values(completeness).map(d => d.percentage);
  const avgCompletion = completions.reduce((sum, p) => sum + p, 0) / completions.length;

  // If anything is missing, average can't be 100%
  const displayAvg = avgCompletion === 100 ? 100 : Math.min(99, Math.floor(avgCompletion));

  console.log(`Average completion: ${displayAvg}%`);
  console.log('='.repeat(60));

  return completeness;
}

/**
 * Check if supported-locales.json is in sync with lang-preload.js
 * and if all referenced locale files exist.
 */
function checkConfigSync() {
  const CONFIG_PATH = path.join(LOCALES_DIR, 'supported-locales.json');
  const PRELOAD_PATH = 'public/js/lang-preload.js';

  console.log('CONFIGURATION SYNC:');
  console.log('-'.repeat(60));

  let hasError = false;

  // 1. Load supported-locales.json
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.error(`✖ Error: Could not read ${CONFIG_PATH}`);
    return true;
  }

  const configCodes = config.supported.map(l => l.code);

  // 2. Load lang-preload.js and extract SUPPORTED_LOCALES
  let preloadContent;
  try {
    preloadContent = fs.readFileSync(PRELOAD_PATH, 'utf8');
  } catch (e) {
    console.error(`✖ Error: Could not read ${PRELOAD_PATH}`);
    return true;
  }

  const preloadMatch = preloadContent.match(/const SUPPORTED_LOCALES = \[(.*?)\];/);
  if (!preloadMatch) {
    console.error(`✖ Error: Could not find SUPPORTED_LOCALES in ${PRELOAD_PATH}`);
    return true;
  }

  const preloadCodes = preloadMatch[1]
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(s => s.length > 0);

  // 3. Compare codes
  const missingInPreload = configCodes.filter(c => !preloadCodes.includes(c));
  const extraInPreload = preloadCodes.filter(c => !configCodes.includes(c));

  if (missingInPreload.length > 0) {
    console.error(`✖ Error: Locales in config but missing in lang-preload.js: ${missingInPreload.join(', ')}`);
    console.error(`  Run 'npm run i18n:extract' to update lang-preload.js`);
    hasError = true;
  }

  if (extraInPreload.length > 0) {
    console.error(`✖ Error: Locales in lang-preload.js but missing in config: ${extraInPreload.join(', ')}`);
    console.error(`  Run 'npm run i18n:extract' to update lang-preload.js`);
    hasError = true;
  }

  // 4. Check for missing JSON files
  configCodes.forEach(code => {
    const filePath = path.join(LOCALES_DIR, `${code}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`✖ Error: Locale file missing for supported language: ${code}.json`);
      hasError = true;
    }
  });

  if (!hasError) {
    console.log('✓ supported-locales.json and lang-preload.js are in sync');
    console.log('✓ All supported locale files exist');
  }

  console.log();
  return hasError;
}

/**
 * Main function
 */
function main() {
  const syncError = checkConfigSync();

  const locales = loadLocales();

  if (!locales[BASE_LOCALE]) {
    console.error(`Base locale ${BASE_LOCALE} not found!`);
    process.exit(1);
  }

  const completeness = generateReport(locales);

  // Check for any translation errors
  const hasTranslationError = Object.values(completeness).some(
    data => data.missing > 0 || data.untranslated > 0
  );

  if (syncError || hasTranslationError) {
    if (hasTranslationError) {
      console.error('✖ Error: Some translations are missing or incomplete.');
    }
    process.exit(1);
  } else {
    console.log('✓ All translations are 100% complete!');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { loadLocales, checkCompleteness, findZombieKeys, getAllKeys };
