const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const MANAGER_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-manager/refs/heads/dev/app/CHANGELOG.md';
const PATCHES_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-patches/refs/heads/dev/CHANGELOG.md';

function repoUrlFromRaw(rawUrl) {
    const match = rawUrl.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//);
    if (!match) throw new Error(`Invalid raw GitHub URL: ${rawUrl}`);
    const [, owner, repo] = match;
    return `https://github.com/${owner}/${repo}`;
}

const MANAGER_REPO = repoUrlFromRaw(MANAGER_URL);
const PATCHES_REPO = repoUrlFromRaw(PATCHES_URL);

const MAX_MANAGER_RELEASES = 10;
const MAX_PATCHES_RELEASES = 10;

const categoryConfig = {
    'added': { icon: '✨', class: 'icon-added' },
    'changed': { icon: '🔄', class: 'icon-changed' },
    'fixed': { icon: '🐛', class: 'icon-fixed' },
    'removed': { icon: '🗑️', class: 'icon-removed' },
    'security': { icon: '🔒', class: 'icon-security' },
    'features': { icon: '✨', class: 'icon-added' },
    'bug fixes': { icon: '🐛', class: 'icon-fixed' }
};

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseChangelog(markdown, type) {
    const lines = markdown.split('\n');
    const versions = [];
    let currentVersion = null;
    let currentCategory = null;
    let inCodeBlock = false;

    for (let line of lines) {
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            continue;
        }

        if (inCodeBlock) continue;

        line = line.trim();
        if (!line) continue;

        const versionMatch = line.match(/^#{1,2}\s+(?:app\s+)?\[([^\]]+)\]\(([^)]+)\)\s*\(?([^)]+)\)?/);

        if (versionMatch) {
            if (currentVersion) versions.push(currentVersion);
            const version = versionMatch[1].trim();
            currentVersion = {
                version,
                link: versionMatch[2].trim(),
                date: versionMatch[3].trim(),
                type,
                isDev: version.includes('-dev') || version.includes('-alpha') || version.includes('-beta'),
                categories: {}
            };
            currentCategory = null;
            continue;
        }

        if (!currentVersion) continue;

        const categoryMatch = line.match(/^###\s+(.+)/);
        if (categoryMatch) {
            const categoryName = categoryMatch[1].toLowerCase().trim();
            currentCategory = categoryName;
            if (!currentVersion.categories[categoryName]) {
                currentVersion.categories[categoryName] = [];
            }
            continue;
        }

        if ((line.startsWith('-') || line.startsWith('*')) && currentCategory) {
            let change = line.substring(1).trim();
            change = change.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
            if (change) {
                currentVersion.categories[currentCategory].push(change);
            }
        }
    }

    if (currentVersion) versions.push(currentVersion);
    return versions;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function parseMarkdown(text) {
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    return text;
}

function parseLinks(text, repoUrl) {
    text = text.replace(/\(#(\d+)\)/g, (match, issue) => {
        return `(<a href="${repoUrl}/issues/${issue}" target="_blank" rel="noopener noreferrer">#${issue}</a>)`;
    });

    text = text.replace(/\(([a-f0-9]{7,8})\)/g, (match, commit) => {
        return `(<a href="${repoUrl}/commit/${commit}" target="_blank" rel="noopener noreferrer">${commit}</a>)`;
    });

    return text;
}

function generateVersionCard(version, repoUrl) {
    const releaseUrl = `${repoUrl}/releases/tag/v${version.version}`;
    const typeBadge = version.type === 'manager'
        ? '<span class="type-badge manager">Manager</span>'
        : '<span class="type-badge patches">Patches</span>';

    let html = `
<div class="version-card" data-type="${version.type}" data-dev="${version.isDev}">
    <div class="version-header">
        <div class="version-title">
            <a href="${escapeHtml(releaseUrl)}" target="_blank" rel="noopener noreferrer" class="version-link">
                v${escapeHtml(version.version)}
            </a>
            ${typeBadge}
        </div>
        <div class="version-date">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${escapeHtml(version.date)}
        </div>
    </div>
    <div class="changes-section">`;

    for (const [category, changes] of Object.entries(version.categories)) {
        if (!changes || changes.length === 0) continue;

        const config = categoryConfig[category] || { icon: '📝', class: 'icon-changed' };
        const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

        html += `
        <div class="change-group">
            <div class="change-category">
                <span class="category-icon ${config.class}">${config.icon}</span>
                <span>${escapeHtml(categoryTitle)}</span>
            </div>
            <ul class="change-list">`;

        changes.forEach(change => {
            let formattedChange = escapeHtml(change);
            formattedChange = parseLinks(formattedChange, repoUrl);
            formattedChange = parseMarkdown(formattedChange);
            html += `<li>${formattedChange}</li>`;
        });

        html += `</ul></div>`;
    }

    html += `</div></div>`;
    return html;
}

async function generateChangelog() {
    console.log('📦 Fetching changelogs...');

    const [managerMd, patchesMd] = await Promise.all([
        fetchUrl(MANAGER_URL),
        fetchUrl(PATCHES_URL)
    ]);

    console.log('📝 Parsing changelogs...');

    const managerVersions = parseChangelog(managerMd, 'manager');
    const patchesVersions = parseChangelog(patchesMd, 'patches');

    function limitStableWithDev(versions, maxStable) {
        const stable = versions
            .filter(v => !v.isDev)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, maxStable);

        const dev = versions
            .filter(v => v.isDev)
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        return [...stable, ...dev];
    }

    const limitedManagerVersions = limitStableWithDev(managerVersions, MAX_MANAGER_RELEASES);
    const limitedPatchesVersions = limitStableWithDev(patchesVersions, MAX_PATCHES_RELEASES);

    const allVersions = [...limitedManagerVersions, ...limitedPatchesVersions]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`✅ Found ${allVersions.length} releases`);

    let html = '';
    allVersions.forEach(version => {
        const repoUrl = version.type === 'manager' ? MANAGER_REPO : PATCHES_REPO;
        html += generateVersionCard(version, repoUrl);
    });

    const templatePath = path.join(__dirname, '../public/changelog/template.html');
    let template = await fs.readFile(templatePath, 'utf8');

    template = template.replace('{{CHANGELOG_CONTENT}}', html);

    const outputPath = path.join(__dirname, '../public/changelog/index.html');
    await fs.writeFile(outputPath, template, 'utf8');

    console.log('✨ Changelog generated successfully!');
}

generateChangelog().catch(console.error);
