#!/usr/bin/env node

/**
 * Regression tests for the HTML-safety validation in check-translations.js
 * (CWE-79 control point: locale JSON values rendered via innerHTML).
 *
 * Usage: node scripts/check-html-safety.test.js
 */

const assert = require('assert');
const {
  findHtmlAllowlistViolations,
  findNoHtmlViolations
} = require('./check-translations');

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    console.error(`✖ FAIL: ${name}`);
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  }
}

// --- data-i18n-html: restricted allowlist ---

test('allowlist rejects <img onerror=...>', () => {
  const violations = findHtmlAllowlistViolations('<img src=x onerror=alert(1)>');
  assert.ok(violations.length > 0, 'expected a violation');
});

test('allowlist rejects <script>', () => {
  const violations = findHtmlAllowlistViolations('<script>alert(1)</script>');
  assert.ok(violations.length > 0, 'expected a violation');
});

test('allowlist rejects javascript: href', () => {
  const violations = findHtmlAllowlistViolations('<a href="javascript:alert(1)">Click</a>');
  assert.ok(violations.length > 0, 'expected a violation');
});

test('allowlist rejects <iframe>', () => {
  const violations = findHtmlAllowlistViolations('<iframe src="https://evil.example"></iframe>');
  assert.ok(violations.length > 0, 'expected a violation');
});

test('allowlist rejects onclick= on an allowed tag', () => {
  const violations = findHtmlAllowlistViolations('<a href="/" onclick="alert(1)">Click</a>');
  assert.ok(violations.length > 0, 'expected a violation');
});

test('allowlist accepts <strong>', () => {
  const violations = findHtmlAllowlistViolations('Read our <strong>privacy policy</strong>.');
  assert.deepStrictEqual(violations, []);
});

test('allowlist accepts the real add-source.desktop-step1 value', () => {
  const violations = findHtmlAllowlistViolations('Install <a href="/">Morphe</a> on your Android device');
  assert.deepStrictEqual(violations, []);
});

test('allowlist accepts the real add-source.desktop-step3 value', () => {
  const violations = findHtmlAllowlistViolations('Tap <strong>Open in Morphe</strong>');
  assert.deepStrictEqual(violations, []);
});

// --- data-i18n-link/data-i18n-links: no HTML allowed at all ---

test('no-html rejects an injected <img onerror=...> alongside the placeholder', () => {
  const violations = findNoHtmlViolations('<img src=x onerror=alert(1)> and %s');
  assert.ok(violations.length > 0, 'expected a violation');
});

test('no-html rejects any wrapping tag around the placeholder', () => {
  const violations = findNoHtmlViolations('<b>%s</b>');
  assert.ok(violations.length > 0, 'expected a violation');
});

test('no-html accepts the real analytics.description value', () => {
  const violations = findNoHtmlViolations(
    'This website uses %s and Google Analytics 4: No cookies, no advertising, no profiling, and no data is sold or shared.'
  );
  assert.deepStrictEqual(violations, []);
});

console.log(`${passed} passed, ${process.exitCode ? 'some failed' : '0 failed'}`);
