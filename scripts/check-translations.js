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

  Object.keys(obj).forEach(key => {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
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
    if (value && typeof value === 'object') {
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
    const untranslated = baseKeys.filter(key => {
      const baseValue = getValue(locales[BASE_LOCALE], key);
      const localeValue = getValue(locales[locale], key);
      return localeValue === baseValue;
    });

    const total = baseKeys.length;
    const translated = total - missing.length;
    const percentage = Math.round((translated / total) * 100);

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
  Object.keys(completeness).sort().forEach(locale => {
    const data = completeness[locale];
    const bar = '█'.repeat(Math.floor(data.percentage / 2));
    const empty = '░'.repeat(50 - Math.floor(data.percentage / 2));

    console.log(`${locale.padEnd(8)} ${bar}${empty} ${data.percentage}%`);
    console.log(`         ${data.translated}/${data.total} translated, ${data.missing} missing, ${data.untranslated} untranslated`);

    if (data.missingKeys.length > 0 && data.missingKeys.length <= 10) {
      console.log(`         Missing: ${data.missingKeys.join(', ')}`);
    } else if (data.missingKeys.length > 10) {
      console.log(`         Missing: ${data.missingKeys.slice(0, 5).join(', ')} ... and ${data.missingKeys.length - 5} more`);
    }
    console.log();
  });

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
  const avgCompletion = Math.round(
    Object.values(completeness).reduce((sum, data) => sum + data.percentage, 0) /
    Object.keys(completeness).length
  );
  console.log(`Average completion: ${avgCompletion}%`);
  console.log('='.repeat(60));
}

/**
 * Main function
 */
function main() {
  const locales = loadLocales();

  if (!locales[BASE_LOCALE]) {
    console.error(`Base locale ${BASE_LOCALE} not found!`);
    process.exit(1);
  }

  generateReport(locales);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { loadLocales, checkCompleteness, findZombieKeys };
