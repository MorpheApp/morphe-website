(function() {
    'use strict';

    const MANAGER_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-manager/refs/heads/dev/app/CHANGELOG.md';
    const PATCHES_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-patches/refs/heads/dev/CHANGELOG.md';
    const MAX_VERSIONS = 6;

    const categoryConfig = {
        'added': {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
            class: 'icon-added'
        },
        'changed': {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>',
            class: 'icon-changed'
        },
        'fixed': {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>',
            class: 'icon-fixed'
        },
        'removed': {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
            class: 'icon-removed'
        },
        'security': {
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',
            class: 'icon-security'
        }
    };

    // Extract GitHub repo URL from raw.githubusercontent.com URL
    function getRepoUrl(rawUrl) {
        // https://raw.githubusercontent.com/MorpheApp/morphe-manager/refs/heads/dev/app/CHANGELOG.md
        // -> https://github.com/MorpheApp/morphe-manager
        const match = rawUrl.match(/raw\.githubusercontent\.com\/([^/]+\/[^/]+)/);
        if (match) {
            return `https://github.com/${match[1]}`;
        }
        return '';
    }

    function initTabs() {
        const tabButtons = document.querySelectorAll('.changelog-tabs .changelog-tab');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.dataset.tab;

                document.querySelectorAll('.changelog-tabs .changelog-tab').forEach(b => {
                    b.classList.remove('active');
                });
                document.querySelectorAll('.changelog-content').forEach(c => {
                    c.classList.remove('active');
                });

                button.classList.add('active');
                const content = document.getElementById(`${tab}-content`);
                if (content) {
                    content.classList.add('active');
                }
            });
        });
    }

    function updateTabVersion(tab, version) {
        const versionElement = document.getElementById(`${tab}-version`);
        if (versionElement && version) {
            versionElement.textContent = `v${version}`;
        }
    }

    function parseMarkdown(text) {
        // Bold
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

        // Italic
        text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
        text = text.replace(/_(.+?)_/g, '<em>$1</em>');

        // Code
        text = text.replace(/`(.+?)`/g, '<code>$1</code>');

        return text;
    }

    function parseLinks(text, repoUrl) {
        // GitHub issue links: (#123)
        text = text.replace(/\(#(\d+)\)/g, (match, issue) => {
            return `(<a href="${repoUrl}/issues/${issue}" target="_blank" rel="noopener noreferrer">#${issue}</a>)`;
        });

        // GitHub commit links: (abc1234) - 7 or 8 char hex
        text = text.replace(/\(([a-f0-9]{7,8})\)/g, (match, commit) => {
            return `(<a href="${repoUrl}/commit/${commit}" target="_blank" rel="noopener noreferrer">${commit}</a>)`;
        });

        return text;
    }

    function parseChangelog(markdown) {
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

            // Version with link:
            // Manager: ## app [1.3.2-dev.3](https://github.com/...) (2026-01-23)
            // Patches: # [1.8.0-dev.7](https://github.com/...) (2026-01-24)
            const versionWithLink = line.match(/^#{1,2}\s+(?:app\s+)?\[([^\]]+)\]\(([^)]+)\)\s*\(?([^)]+)\)?/);
            // Version simple: ## [1.3.2-dev.3] - 2026-01-23
            const versionSimple = line.match(/^#{1,2}\s+(?:app\s+)?\[([^\]]+)\]\s*[-–]\s*\(?([^)]+)\)?/);

            if (versionWithLink) {
                if (currentVersion) versions.push(currentVersion);
                currentVersion = {
                    version: versionWithLink[1].trim(),
                    link: versionWithLink[2].trim(),
                    date: versionWithLink[3].trim(),
                    categories: {}
                };
                currentCategory = null;
            } else if (versionSimple) {
                if (currentVersion) versions.push(currentVersion);
                currentVersion = {
                    version: versionSimple[1].trim(),
                    link: null,
                    date: versionSimple[2].trim(),
                    categories: {}
                };
                currentCategory = null;
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
                // Remove markdown links but keep text: [text](url) -> text
                change = change.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

                if (change) {
                    currentVersion.categories[currentCategory].push(change);
                }
            }
        }

        if (currentVersion) versions.push(currentVersion);

        return versions.slice(0, MAX_VERSIONS);
    }

    function renderChangelog(versions, containerId, repoUrl) {
        const container = document.getElementById(containerId);

        if (!versions || versions.length === 0) {
            container.innerHTML = '<div class="changelog-empty">No changelog data available</div>';
            return;
        }

        // Update tab with latest version
        const tab = containerId.replace('-content', '');
        updateTabVersion(tab, versions[0].version);

        let html = '<div class="changelog-grid">';

        versions.forEach((version, index) => {
            const cardId = `card-${containerId}-${index}`;

            // Create release URL from version
            const releaseUrl = `${repoUrl}/releases/tag/v${version.version}`;

            html += `<div class="version-card" id="${cardId}">`;
            html += '<div class="version-header">';
            html += '<div class="version-title">';

            html += `<a href="${escapeHtml(releaseUrl)}" target="_blank" rel="noopener noreferrer" class="version-link">v${escapeHtml(version.version)}</a>`;

            if (index === 0) {
                html += '<span class="version-badge">Latest</span>';
            }

            html += '</div>';
            html += '<div class="version-date">';
            html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
            html += escapeHtml(version.date);
            html += '</div>';
            html += '</div>';

            html += '<div class="changes-section">';

            for (const [category, changes] of Object.entries(version.categories)) {
                if (!changes || changes.length === 0) continue;

                const config = categoryConfig[category] || {
                    icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
                    class: 'icon-changed'
                };

                const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

                html += '<div class="change-group">';
                html += '<div class="change-category">';
                html += `<span class="category-icon ${config.class}">${config.icon}</span>`;
                html += `<span>${escapeHtml(categoryTitle)}</span>`;
                html += '</div>';
                html += '<ul class="change-list">';

                changes.forEach(change => {
                    let formattedChange = escapeHtml(change);
                    formattedChange = parseLinks(formattedChange, repoUrl);
                    formattedChange = parseMarkdown(formattedChange);
                    html += `<li>${formattedChange}</li>`;
                });

                html += '</ul>';
                html += '</div>';
            }

            html += '</div>';

            html += `<button class="expand-button" onclick="toggleCard('${cardId}')">`;
            html += '<span class="expand-text">Show more</span>';
            html += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';
            html += '</button>';

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;

        // Check which cards need expand button
        setTimeout(() => {
            versions.forEach((version, index) => {
                const cardId = `card-${containerId}-${index}`;
                const card = document.getElementById(cardId);
                if (card) {
                    const changesSection = card.querySelector('.changes-section');
                    if (changesSection && changesSection.scrollHeight > changesSection.clientHeight) {
                        card.classList.add('has-overflow');
                    }
                }
            });
        }, 100);
    }

    window.toggleCard = function(cardId) {
        const card = document.getElementById(cardId);
        if (card) {
            card.classList.toggle('expanded');
            const button = card.querySelector('.expand-button .expand-text');
            if (button) {
                button.textContent = card.classList.contains('expanded') ? 'Show less' : 'Show more';
            }
        }
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function loadChangelog(url, containerId) {
        const container = document.getElementById(containerId);
        const repoUrl = getRepoUrl(url);

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const markdown = await response.text();
            const versions = parseChangelog(markdown);

            renderChangelog(versions, containerId, repoUrl);
        } catch (error) {
            console.error('Error loading changelog:', error);
            container.innerHTML = `
                <div class="changelog-error">
                    <strong>Error loading changelog:</strong> ${escapeHtml(error.message)}
                </div>
            `;

            // Update tab version on error
            const tab = containerId.replace('-content', '');
            const versionElement = document.getElementById(`${tab}-version`);
            if (versionElement) {
                versionElement.textContent = 'Error';
            }
        }
    }

    function init() {
        initTabs();
        loadChangelog(MANAGER_URL, 'manager-content');
        loadChangelog(PATCHES_URL, 'patches-content');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
