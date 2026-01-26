const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const PATCHES_LIST_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-patches/refs/heads/dev/patches-list.json';

/**
 * Fetch content from URL using HTTPS
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} Response data
 */
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Generate HTML card for a single patch
 * @param {Object} patch - Patch data
 * @param {string} packageName - Package name
 * @returns {string} HTML card
 */
function generatePatchCard(patch, packageName) {
    // Display "All versions" since we don't have specific version info
    const compatibleVersions = 'All versions';

    let optionsHtml = '';
    if (patch.options && patch.options.length > 0) {
        optionsHtml = `
        <div class="patch-section">
            <div class="patch-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m5.2-11.2l-4.2 4.2m0 6l4.2 4.2M23 12h-6m-6 0H5m16.2-5.2l-4.2 4.2m0 6l4.2 4.2"></path>
                </svg>
                Options
            </div>
            <div class="patch-options-grid">
                ${patch.options.map(opt => `
                    <div class="patch-option">
                        <div class="patch-option-title">${escapeHtml(opt.title || opt.key)}</div>
                        ${opt.description ? `<div class="patch-option-desc">${escapeHtml(opt.description)}</div>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    let dependenciesHtml = '';
    if (patch.dependencies && patch.dependencies.length > 0) {
        dependenciesHtml = `
        <div class="patch-section">
            <div class="patch-section-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="16 18 22 12 16 6"></polyline>
                    <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                Dependencies
            </div>
            <ul class="patch-list">
                ${patch.dependencies.map(dep => `<li>${escapeHtml(dep)}</li>`).join('')}
            </ul>
        </div>`;
    }

    return `
<div class="patch-card" data-package="${escapeHtml(packageName)}" data-name="${escapeHtml(patch.name)}" data-description="${escapeHtml(patch.description || '')}">
    <div class="patch-header">
        <div class="patch-title-row">
            <div class="patch-name">${escapeHtml(patch.name)}</div>
            <span class="patch-badge">${escapeHtml(packageName)}</span>
        </div>
        <div class="patch-meta">
            <div class="patch-meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
                ${escapeHtml(compatibleVersions)}
            </div>
        </div>
        ${patch.description ? `<p class="patch-description">${escapeHtml(patch.description)}</p>` : ''}
    </div>
    <div class="patch-content">
        ${optionsHtml}
        ${dependenciesHtml}
    </div>
    <button class="patch-toggle-btn">
        <span>Show Details</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
    </button>
</div>`;
}

/**
 * Main function to generate patches HTML page
 */
async function generatePatches() {
    console.log('📦 Fetching patches list...');

    const patchesJson = await fetchUrl(PATCHES_LIST_URL);
    const patchesData = JSON.parse(patchesJson);

    console.log('📝 Parsing patches...');
    console.log('Data keys:', Object.keys(patchesData));

    // Check data structure and extract patches array
    let patchesArray = [];

    if (Array.isArray(patchesData)) {
        // If root is array
        patchesArray = patchesData;
        console.log('Using root array');
    } else if (patchesData.patches && Array.isArray(patchesData.patches)) {
        // If patches field exists and is an array - use it directly
        patchesArray = patchesData.patches;
        console.log(`Found patches array with ${patchesArray.length} items (version: ${patchesData.version})`);
    } else {
        console.error('Unexpected data structure. Available keys:', Object.keys(patchesData));
        throw new Error('Unexpected patches data structure');
    }

    if (patchesArray.length === 0) {
        console.error('❌ Patches array is empty');
        throw new Error('No patches found');
    }

    console.log(`Processing ${patchesArray.length} patches...`);

    // Log first patch for debugging
    if (patchesArray.length > 0) {
        console.log('First patch:', patchesArray[0].name);
        console.log('compatiblePackages type:', typeof patchesArray[0].compatiblePackages);
    }

    const packageNames = new Set();
    const allPatches = [];

    patchesArray.forEach(patch => {
        if (!patch.name) {
            console.warn('Skipping patch without name:', patch);
            return;
        }

        // Check if compatiblePackages exists
        if (!patch.compatiblePackages) {
            console.warn(`Skipping patch "${patch.name}" - compatiblePackages is null/undefined`);
            return;
        }

        // Handle different formats:
        // 1. Array of strings: ["com.google.android.youtube", ...]
        // 2. Array of objects: [{name: "com.google.android.youtube", versions: [...]}, ...]
        // 3. Object with package names as keys: { "com.google.android.youtube": [...], ... }

        let packagesList = [];

        if (Array.isArray(patch.compatiblePackages)) {
            // Format 1 or 2: Array
            packagesList = patch.compatiblePackages;
        } else if (typeof patch.compatiblePackages === 'object') {
            // Format 3: Object with package names as keys
            packagesList = Object.keys(patch.compatiblePackages);
        }

        if (packagesList.length === 0) {
            console.warn(`Skipping patch "${patch.name}" - no compatible packages found`);
            return;
        }

        packagesList.forEach(pkg => {
            let packageName;

            if (typeof pkg === 'string') {
                // Direct string (format 1 or 3)
                packageName = pkg;
            } else if (typeof pkg === 'object' && pkg.name) {
                // Object with name field (format 2)
                packageName = pkg.name;
            } else {
                console.warn(`Skipping invalid package format in patch "${patch.name}":`, pkg);
                return;
            }

            packageNames.add(packageName);
            allPatches.push({ patch, packageName });
        });
    });

    console.log(`✅ Found ${allPatches.length} patch entries for ${packageNames.size} packages`);
    console.log(`📦 Packages: ${Array.from(packageNames).join(', ')}`);

    if (allPatches.length === 0) {
        console.error('❌ No valid patches found after processing');
        throw new Error('No valid patches to display');
    }

    // Generate filter buttons HTML
    let filtersHtml = '';
    Array.from(packageNames).sort().forEach(pkg => {
        const displayName = pkg.split('.').pop();
        filtersHtml += `<button class="filter-btn" data-filter="${escapeHtml(pkg)}" data-umami-event="Patches Filter ${displayName}">
            <span>${escapeHtml(displayName)}</span>
        </button>`;
    });

    // Generate patches cards HTML
    let patchesHtml = '';
    allPatches
        .sort((a, b) => a.patch.name.localeCompare(b.patch.name))
        .forEach(({ patch, packageName }) => {
            patchesHtml += generatePatchCard(patch, packageName);
        });

    // Read template and replace placeholders
    const patchesPath = path.join(__dirname, '../public/patches.html');
    let template = await fs.readFile(patchesPath, 'utf8');

    template = template.replace('<!-- Package filters will be generated dynamically -->', filtersHtml);
    template = template.replace('{{PATCHES_CONTENT}}', patchesHtml);

    // Write generated HTML
    await fs.writeFile(patchesPath, template, 'utf8');

    console.log('✨ Patches page generated successfully!');
}

generatePatches().catch(console.error);
