#!/usr/bin/env node

/**
 * i18n JSON Generator for Morphe
 *
 * This tool extracts all i18n keys from HTML files and generates
 * a base JSON file that can be used for translations.
 *
 * Usage: node scripts/generate-i18n-keys.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const HTML_DIR = 'public';
const LOCALES_DIR = 'public/locales';
const BASE_LOCALE = 'en';

// Supported locales with region codes
const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English' },
  { code: 'uk-UA', name: 'Ukrainian' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'de-DE', name: 'Deutsch' },
  { code: 'fr-FR', name: 'French' },
  { code: 'pt-BR', name: 'Brazilian Portuguese' },
  { code: 'pt-PT', name: 'Portuguese' }
];

/**
 * Extract all i18n keys from HTML files
 */
function extractKeys() {
  const keys = new Map();
  const htmlFiles = glob.sync(`${HTML_DIR}/**/*.html`);

  console.log(`Found ${htmlFiles.length} HTML files`);

  htmlFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');

    // Extract data-i18n attributes
    const i18nMatches = content.matchAll(/data-i18n="([^"]+)"/g);
    for (const match of i18nMatches) {
      const key = match[1];
      // Get the text content between tags as default value
      const tagRegex = new RegExp(`data-i18n="${key}"[^>]*>([^<]+)<`, 'g');
      const tagMatch = tagRegex.exec(content);
      const defaultValue = tagMatch ? tagMatch[1].trim() : key;

      if (!keys.has(key)) {
        keys.set(key, defaultValue);
      }
    }

    // Extract data-i18n-placeholder attributes
    const placeholderMatches = content.matchAll(/data-i18n-placeholder="([^"]+)"/g);
    for (const match of placeholderMatches) {
      const key = match[1];
      const placeholderRegex = new RegExp(`data-i18n-placeholder="${key}"[^>]*placeholder="([^"]+)"`, 'g');
      const placeholderMatch = placeholderRegex.exec(content);
      const defaultValue = placeholderMatch ? placeholderMatch[1].trim() : key;

      if (!keys.has(key)) {
        keys.set(key, defaultValue);
      }
    }

    // Extract data-i18n-aria attributes
    const ariaMatches = content.matchAll(/data-i18n-aria="([^"]+)"/g);
    for (const match of ariaMatches) {
      const key = match[1];
      const ariaRegex = new RegExp(`data-i18n-aria="${key}"[^>]*aria-label="([^"]+)"`, 'g');
      const ariaMatch = ariaRegex.exec(content);
      const defaultValue = ariaMatch ? ariaMatch[1].trim() : key;

      if (!keys.has(key)) {
        keys.set(key, defaultValue);
      }
    }

    // Extract data-i18n-title attributes
    const titleMatches = content.matchAll(/data-i18n-title="([^"]+)"/g);
    for (const match of titleMatches) {
      const key = match[1];
      const titleRegex = new RegExp(`data-i18n-title="${key}"[^>]*title="([^"]+)"`, 'g');
      const titleMatch = titleRegex.exec(content);
      const defaultValue = titleMatch ? titleMatch[1].trim() : key;

      if (!keys.has(key)) {
        keys.set(key, defaultValue);
      }
    }
  });

  return keys;
}

/**
 * Convert flat keys to nested object structure
 * Example: "nav.home" => { nav: { home: "value" } }
 */
function keysToNestedObject(keys) {
  const result = {};

  keys.forEach((value, key) => {
    const parts = key.split('.');
    let current = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = value;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    });
  });

  return result;
}

/**
 * Merge new keys with existing translations
 * Preserves existing translations and adds new keys
 */
function mergeTranslations(existing, newKeys) {
  const result = { ...existing };

  Object.keys(newKeys).forEach(key => {
    if (typeof newKeys[key] === 'object' && !Array.isArray(newKeys[key])) {
      if (!result[key] || typeof result[key] !== 'object') {
        result[key] = {};
      }
      result[key] = mergeTranslations(result[key], newKeys[key]);
    } else {
      // Only add if key doesn't exist (preserve existing translations)
      if (!result.hasOwnProperty(key)) {
        result[key] = newKeys[key];
      }
    }
  });

  return result;
}

/**
 * Remove zombie keys that no longer exist in HTML
 */
function removeZombieKeys(existing, newKeys) {
  const result = {};

  Object.keys(existing).forEach(key => {
    if (newKeys.hasOwnProperty(key)) {
      if (typeof newKeys[key] === 'object' && typeof existing[key] === 'object') {
        result[key] = removeZombieKeys(existing[key], newKeys[key]);
      } else {
        result[key] = existing[key];
      }
    }
    // If key doesn't exist in newKeys, it's a zombie - don't include it
  });

  return result;
}

/**
 * Generate or update locale files
 */
function generateLocaleFiles(keys) {
  // Create locales directory if it doesn't exist
  if (!fs.existsSync(LOCALES_DIR)) {
    fs.mkdirSync(LOCALES_DIR, { recursive: true });
  }

  const nestedKeys = keysToNestedObject(keys);

  SUPPORTED_LOCALES.forEach(locale => {
    const filePath = path.join(LOCALES_DIR, `${locale.code}.json`);
    let translations = {};

    // Load existing translations if file exists
    if (fs.existsSync(filePath)) {
      try {
        translations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`Loaded existing translations for ${locale.name} (${locale.code})`);
      } catch (error) {
        console.error(`Error reading ${filePath}:`, error.message);
      }
    }

    // For base locale (English), use extracted values
    if (locale.code === BASE_LOCALE) {
      // Merge new keys with existing translations
      translations = mergeTranslations(translations, nestedKeys);
      // Remove zombie keys
      translations = removeZombieKeys(translations, nestedKeys);
    } else {
      // For other locales, preserve existing translations and add new keys as placeholders
      const placeholders = JSON.parse(JSON.stringify(nestedKeys)); // Deep clone
      translations = mergeTranslations(translations, placeholders);
      translations = removeZombieKeys(translations, nestedKeys);
    }

    // Write updated translations
    fs.writeFileSync(
      filePath,
      JSON.stringify(translations, null, 2) + '\n',
      'utf8'
    );

    console.log(`✓ Generated ${filePath}`);
  });
}

/**
 * Generate list of supported locales for documentation
 */
function generateLocalesList() {
  const listPath = path.join(LOCALES_DIR, 'supported-locales.json');

  const localesInfo = {
    default: BASE_LOCALE,
    supported: SUPPORTED_LOCALES.map(l => ({
      code: l.code,
      name: l.name,
      region: l.code.includes('-') ? l.code.split('-')[1] : null
    }))
  };

  fs.writeFileSync(
    listPath,
    JSON.stringify(localesInfo, null, 2) + '\n',
    'utf8'
  );

  console.log(`✓ Generated ${listPath}`);
}

/**
 * Main function
 */
function main() {
  console.log('Extracting i18n keys from HTML files...\n');

  const keys = extractKeys();
  console.log(`\nFound ${keys.size} unique translation keys`);

  console.log('\nGenerating locale files...\n');
  generateLocaleFiles(keys);

  console.log('\nGenerating supported locales list...');
  generateLocalesList();

  console.log('\n✓ Done! All locale files have been updated.');
  console.log('\nNext steps:');
  console.log('1. Review generated files in public/locales/');
  console.log('2. Upload to Crowdin for translation');
  console.log('3. Download translated files back to public/locales/');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { extractKeys, keysToNestedObject, mergeTranslations, removeZombieKeys };
