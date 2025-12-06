#!/usr/bin/env node
/**
 * generate-robots.js
 *
 * Usage:
 *  - Ensure this runs after the project's build step and that the build output is in ./dist
 *  - Provide BRANCH_NAME env var (CI systems usually provide this). If not provided, it will check GITHUB_REF_NAME.
 *
 * Behavior:
 *  - If BRANCH_NAME !== 'main', create dist/robots.txt with "User-agent: *\nDisallow: /"
 *  - Inject <meta name="robots" content="noindex, nofollow" /> into each .html file in dist if not already present.
 *  - If dist/ is missing, the script prints a warning and exits 0 (non-fatal).
 */
const fs = require('fs');
const path = require('path');

const branch = process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME || '';
const isMain = branch === 'main';
const outDir = path.resolve(process.cwd(), 'dist');

function getHtmlFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...getHtmlFiles(full));
    } else if (e.isFile() && full.toLowerCase().endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

if (!fs.existsSync(outDir)) {
  console.warn(`Warning: build output directory not found at ${outDir}. Skipping robots/meta injection.`);
  process.exit(0);
}

if (!isMain) {
  // Write robots.txt
  const robotsContent = 'User-agent: *\nDisallow: /\n';
  try {
    fs.writeFileSync(path.join(outDir, 'robots.txt'), robotsContent, 'utf8');
    console.log('Created dist/robots.txt (noindex for non-main branch).');
  } catch (err) {
    console.error('Failed to write robots.txt:', err);
    process.exit(1);
  }

  // Inject meta into HTML files
  const htmlFiles = getHtmlFiles(outDir);
  if (htmlFiles.length === 0) {
    console.log('No HTML files found in dist/; nothing to inject.');
    process.exit(0);
  }

  htmlFiles.forEach((filePath) => {
    try {
      let html = fs.readFileSync(filePath, 'utf8');
      if (/name\s*=\s*["']robots["']/i.test(html)) {
        console.log(`Robots meta already present in ${path.relative(outDir, filePath)}; skipping.`);
        return;
      }
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head([^>]*)>/i, `<head$1>\n  <meta name="robots" content="noindex, nofollow" />`);
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`Injected robots meta into ${path.relative(outDir, filePath)}.`);
      } else {
        // fallback: insert at top
        html = `<meta name="robots" content="noindex, nofollow" />\n` + html;
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`No <head> found; prefixed robots meta in ${path.relative(outDir, filePath)}.`);
      }
    } catch (err) {
      console.error(`Failed to process ${filePath}:`, err);
    }
  });
} else {
  console.log('Branch is main; leaving build indexable (no robots changes).');
}
