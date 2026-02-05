#!/usr/bin/env node

/**
 * Minify HTML, CSS, and JavaScript files for production deployment
 *
 * Usage: node scripts/minify.js
 */

const fs = require('fs');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');
const { minify: minifyJS } = require('terser');

const PUBLIC_DIR = 'public';
const EXCLUDED_FILES = ['robots.txt', 'manifest.json', 'site.webmanifest'];
const EXCLUDED_DIRS = ['locales']; // Don't minify JSON translation files

// HTML minification options
const HTML_OPTIONS = {
  collapseWhitespace: true,
  removeComments: true,
  removeRedundantAttributes: true,
  removeScriptTypeAttributes: true,
  removeStyleLinkTypeAttributes: true,
  minifyCSS: true,
  minifyJS: true,
  minifyURLs: true
};

// JavaScript minification options
const JS_OPTIONS = {
  compress: {
    drop_console: false, // Keep console for debugging
    dead_code: true,
    drop_debugger: true
  },
  mangle: true,
  format: {
    comments: false
  }
};

/**
 * Get file size in KB
 */
function getFileSizeKB(filePath) {
  return (fs.statSync(filePath).size / 1024).toFixed(2);
}

/**
 * Recursively get all files in directory
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check if file should be minified
 */
function shouldMinify(filePath) {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath);

  if (EXCLUDED_FILES.includes(basename)) {
    return false;
  }

  return ['.html', '.js', '.css'].includes(ext);
}

/**
 * Minify HTML file
 */
async function minifyHTMLFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8');

    const minified = await minifyHTML(content, HTML_OPTIONS);
    const minifiedSize = Buffer.byteLength(minified, 'utf8');

    fs.writeFileSync(filePath, minified, 'utf8');

    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
    const originalKB = (originalSize / 1024).toFixed(2);
    const minifiedKB = (minifiedSize / 1024).toFixed(2);

    console.log(`✓ ${path.relative(PUBLIC_DIR, filePath)}`);
    console.log(`  ${originalKB} KB → ${minifiedKB} KB (${savings}% smaller)`);
  } catch (error) {
    console.error(`✗ ${path.relative(PUBLIC_DIR, filePath)}:`, error.message);
  }
}

/**
 * Minify JavaScript file
 */
async function minifyJSFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8');

    const result = await minifyJS(content, JS_OPTIONS);

    if (result.code) {
      const minifiedSize = Buffer.byteLength(result.code, 'utf8');
      fs.writeFileSync(filePath, result.code, 'utf8');

      const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
      const originalKB = (originalSize / 1024).toFixed(2);
      const minifiedKB = (minifiedSize / 1024).toFixed(2);

      console.log(`✓ ${path.relative(PUBLIC_DIR, filePath)}`);
      console.log(`  ${originalKB} KB → ${minifiedKB} KB (${savings}% smaller)`);
    }
  } catch (error) {
    console.error(`✗ ${path.relative(PUBLIC_DIR, filePath)}:`, error.message);
  }
}

/**
 * Minify single file
 */
async function minifyFile(filePath) {
  const ext = path.extname(filePath);

  if (ext === '.html' || ext === '.css') {
    await minifyHTMLFile(filePath);
  } else if (ext === '.js') {
    await minifyJSFile(filePath);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🗜️  Minifying files for production...\n');

  const allFiles = getAllFiles(PUBLIC_DIR);
  const filesToMinify = allFiles.filter(shouldMinify);

  console.log(`Found ${filesToMinify.length} files to minify\n`);

  let totalOriginal = 0;
  let totalMinified = 0;

  for (const file of filesToMinify) {
    const originalSize = fs.statSync(file).size;
    await minifyFile(file);
    const minifiedSize = fs.statSync(file).size;

    totalOriginal += originalSize;
    totalMinified += minifiedSize;
    console.log(); // Empty line between files
  }

  const totalSavings = ((1 - totalMinified / totalOriginal) * 100).toFixed(1);
  const totalOriginalKB = (totalOriginal / 1024).toFixed(2);
  const totalMinifiedKB = (totalMinified / 1024).toFixed(2);

  console.log('='.repeat(60));
  console.log(`Total: ${totalOriginalKB} KB → ${totalMinifiedKB} KB`);
  console.log(`Saved: ${totalSavings}% (${(totalOriginal - totalMinified) / 1024 | 0} KB)`);
  console.log('='.repeat(60));
  console.log('\n✨ Minification complete!');
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { minifyFile, shouldMinify };
