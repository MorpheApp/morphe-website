const fs = require('fs').promises;
const path = require('path');
const https = require('https');
const { marked } = require('marked');

const QUESTIONS_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-documentation/main/docs/morphe-resources/questions.md';
const TROUBLESHOOTING_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-documentation/main/docs/morphe-resources/troubleshooting.md';

/**
 * Configure Marked for GitHub-style Markdown
 */
marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false
});

/**
 * Custom renderer to handle GitHub Alerts and ensure relative links are handled
 * For Marked v11+, the arguments are objects.
 */
const ALERT_MARKER = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/i;

// Raw block-level HTML that must never be wrapped in a <p>.
const BLOCK_HTML = /<\/?(details|summary|div|section|table|ul|ol|li|pre|blockquote|h[1-6])\b/i;

/**
 * Detect a GitHub Alert marker at the start of a blockquote and strip it from
 * the tokens, so the paragraph renderer emits the remaining text as usual.
 */
function extractAlertType(tokens) {
    const first = tokens[0];
    if (!first || first.type !== 'paragraph') return null;

    const match = first.text.match(ALERT_MARKER);
    if (!match) return null;

    first.text = first.text.replace(ALERT_MARKER, '');

    const inline = first.tokens || [];
    if (inline.length && inline[0].type === 'text') {
        inline[0].text = inline[0].text.replace(ALERT_MARKER, '');
        inline[0].raw = inline[0].text;
    }

    // With `breaks: true` the marker is its own text token followed by a <br>.
    // Drop both, otherwise the alert opens with a blank line.
    while (inline.length &&
        ((inline[0].type === 'text' && inline[0].text.trim() === '') || inline[0].type === 'br')) {
        inline.shift();
    }

    return match[1].toUpperCase();
}

const renderer = {
    blockquote({ tokens }) {
        // GitHub Alerts must wrap the *whole* quote. Wrapping only the paragraph
        // that carries the [!TYPE] marker splits raw HTML blocks such as
        // <details>...</details> across the wrapper and produces crossed tags.
        const alertType = extractAlertType(tokens);
        const body = this.parser.parse(tokens);

        if (alertType) {
            return `<div class="faq-alert alert-${alertType.toLowerCase()}"><div class="alert-title"><span class="material-symbols-rounded">info</span> ${alertType}</div>${body}</div>`;
        }

        return `<blockquote>${body}</blockquote>`;
    },
    paragraph({ tokens, text }) {
        // Markdown allows raw block-level HTML inside a paragraph; wrapping it in
        // <p> would close the paragraph early and orphan the closing tag.
        if (BLOCK_HTML.test(text)) {
            return this.parser.parseInline(tokens);
        }
        // For normal paragraphs, we must call parseInline on the tokens to avoid [object Object]
        return `<p>${this.parser.parseInline(tokens)}</p>`;
    },
    link({ href, title, text }) {
        // Ensure all external links open in new tab
        const isExternal = href && href.startsWith('http');
        const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
        return `<a href="${href}"${target}${title ? ` title="${title}"` : ''}>${text}</a>`;
    },
    heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        return `<h${depth}>${text}</h${depth}>`;
    },
    strong({ tokens }) {
        return `<strong>${this.parser.parseInline(tokens)}</strong>`;
    },
    em({ tokens }) {
        return `<em>${this.parser.parseInline(tokens)}</em>`;
    },
    codespan({ text }) {
        return `<code>${text}</code>`;
    },
    list({ items, ordered, start }) {
        let body = '';
        for (const item of items) {
            body += this.listitem(item);
        }
        const type = ordered ? 'ol' : 'ul';
        const startAttr = (ordered && start !== 1) ? ` start="${start}"` : '';
        return `<${type}${startAttr}>\n${body}</${type}>\n`;
    },
    listitem({ tokens }) {
        return `<li>${this.parser.parseInline(tokens)}</li>\n`;
    }
};

marked.use({ renderer });

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
                res.resume();
                return;
            }

            res.setEncoding('utf8');
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.setTimeout(15000, () => req.destroy(new Error('Request timed out')));
        req.on('error', (err) => {
            reject(new Error(`Network error fetching ${url}: ${err.message}`));
        });
    });
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Parse markdown into structured entries using the ## N. Title heading format.
 */
function parseEntries(markdown) {
    const lines = markdown.split('\n');
    const entries = [];
    let currentEntry = null;
    let inCodeBlock = false;

    for (let line of lines) {
        if (line.trim().startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            if (currentEntry) {
                currentEntry.bodyLines.push(line);
            }
            continue;
        }

        if (inCodeBlock) {
            if (currentEntry) {
                currentEntry.bodyLines.push(line);
            }
            continue;
        }

        const headingMatch = line.match(/^##\s+(\d+)\.\s+(.+)/);
        if (headingMatch) {
            if (currentEntry) entries.push(currentEntry);
            currentEntry = {
                number: parseInt(headingMatch[1]),
                title: headingMatch[2].trim(),
                bodyLines: []
            };
            continue;
        }

        if (line.match(/^#\s+/)) continue;

        if (currentEntry) {
            currentEntry.bodyLines.push(line);
        }
    }

    if (currentEntry) entries.push(currentEntry);
    return entries;
}

/**
 * Generate an accordion item for a FAQ/troubleshooting entry.
 */
function generateAccordionItem(entry, displayNumber, section) {
    const anchorId = `${section}-${displayNumber}`;
    const answerId = `${anchorId}-answer`;
    const bodyContent = entry.bodyLines.join('\n');
    const bodyHtml = marked.parse(bodyContent);

    return `
<div class="faq-item" data-section="${section}" id="${anchorId}">
    <button class="faq-question" data-umami-event="FAQ Page Expand" data-umami-event-question="${escapeHtml(entry.title)}" aria-controls="${answerId}">
        <span class="faq-number">${displayNumber}</span>
        <span class="faq-text">${escapeHtml(entry.title)}</span>
        <span class="material-symbols-rounded">expand_more</span>
    </button>
    <div class="faq-answer" id="${answerId}">
        ${bodyHtml}
    </div>
</div>`;
}

async function generateFaq() {
    console.log('📦 Fetching FAQ and troubleshooting content...');

    const [questionsMd, troubleshootingMd] = await Promise.all([
        fetchUrl(QUESTIONS_URL),
        fetchUrl(TROUBLESHOOTING_URL)
    ]);

    if (!questionsMd || !questionsMd.trim()) {
        throw new Error(`Fetched empty content from ${QUESTIONS_URL}`);
    }
    if (!troubleshootingMd || !troubleshootingMd.trim()) {
        throw new Error(`Fetched empty content from ${TROUBLESHOOTING_URL}`);
    }

    console.log('📝 Parsing content...');

    const faqEntries = parseEntries(questionsMd);
    const troubleshootingEntries = parseEntries(troubleshootingMd);

    console.log(`✅ Found ${faqEntries.length} FAQ entries and ${troubleshootingEntries.length} troubleshooting entries`);

    // Generate FAQ section
    let html = '<div class="faq-section" data-section="faq">';
    html += '<h2 class="faq-section-title"><span class="material-symbols-rounded faq-section-icon">help</span> <span data-i18n="faq-page.filter-faq">FAQ</span></h2>';
    faqEntries.forEach((entry, index) => {
        html += generateAccordionItem(entry, index + 1, 'faq');
    });
    html += '</div>';

    // Generate Troubleshooting section
    html += '<div class="faq-section" data-section="troubleshooting">';
    html += '<h2 class="faq-section-title"><span class="material-symbols-rounded faq-section-icon">build</span> <span data-i18n="faq-page.filter-troubleshooting">Troubleshooting</span></h2>';
    troubleshootingEntries.forEach((entry, index) => {
        html += generateAccordionItem(entry, index + 1, 'troubleshooting');
    });
    html += '</div>';

    const faqPath = path.join(__dirname, '../public/faq.html');
    let template = await fs.readFile(faqPath, 'utf8');

    // Restore placeholder if already replaced
    if (!template.includes('{{FAQ_CONTENT}}')) {
        const startMarker = '<div class="faq-list" id="faq-content">';
        const endMarker = '</div>\n        </div>\n    </div>\n</section>';
        const startIndex = template.indexOf(startMarker);
        const endIndex = template.indexOf(endMarker);

        if (startIndex !== -1 && endIndex !== -1) {
            template = template.substring(0, startIndex + startMarker.length) + '\n            {{FAQ_CONTENT}}\n        ' + template.substring(endIndex);
        } else {
            throw new Error('faq.html does not contain {{FAQ_CONTENT}} placeholder and could not auto-restore it');
        }
    }

    template = template.replace('{{FAQ_CONTENT}}', html);

    await fs.writeFile(faqPath, template, 'utf8');

    console.log('✨ FAQ page generated successfully!');
}

generateFaq().catch(err => {
    console.error('❌ FAQ generation failed:', err.message);
    process.exit(1);
});
