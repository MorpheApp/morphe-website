#!/usr/bin/env node
const inliner = require('web-resource-inliner');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const PUBLIC_DIR = path.join(__dirname, '../public');

// Get all HTML files in public/
const htmlFiles = glob.sync(path.join(PUBLIC_DIR, '*.html'));

/**
 * Get file size in KB
 */
function getFileSizeKB(filePath) {
  return (fs.statSync(filePath).size / 1024).toFixed(2);
}

async function inlineFile(filePath) {
  const originalSize = getFileSizeKB(filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  return new Promise((resolve, reject) => {
    inliner.html(
      {
        fileContent: content,
        relativeTo: PUBLIC_DIR,
        images: 4, // Images less than 4kb
        scripts: 10, // Scripts less than 10kb
        links: false,
      },
      (err, result) => {
        if (err) {
          console.error(`✗ Failed to inline ${filePath}:`, err.message);
          reject(err);
          return;
        }

        fs.writeFileSync(filePath, result, 'utf8');
        const inlinedSize = getFileSizeKB(filePath);
        const change = inlinedSize - originalSize;
        const sign = change >= 0 ? '+' : '-';
        const percent = ((inlinedSize - originalSize) / originalSize * 100).toFixed(1);

        console.log(`✓ Inlined: ${filePath}`);
        console.log(`  ${originalSize} KB → ${inlinedSize} KB (${sign}${Math.abs(change)} KB, ${sign}${percent}%)`);

        resolve();
      }
    );
  });
}

(async () => {
  for (const file of htmlFiles) {
    try {
      await inlineFile(file);
    } catch (err) {
      // Already logged; continue
    }
  }
})();
