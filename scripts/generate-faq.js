const fs = require('fs').promises;
const path = require('path');
const https = require('https');

const QUESTIONS_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-documentation/main/docs/morphe-resources/questions.md';
const TROUBLESHOOTING_URL = 'https://raw.githubusercontent.com/MorpheApp/morphe-documentation/main/docs/morphe-resources/troubleshooting.md';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
                res.resume();
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => {
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

function parseMarkdown(text) {
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    text = text.replace(/`(.+?)`/g, '<code>$1</code>');
    return text;
}

function parseLinksFromMarkdown(text) {
    // Convert markdown links [text](url) to <a> tags
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(linkText)}</a>`;
    });
    return text;
}

/**
 * Parse markdown with ## N. Title heading format into structured entries.
 * Returns array of { number, title, bodyLines[] }
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

        // Match ## N. Title (with optional parenthetical subtitle)
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

        // Skip the top-level # heading
        if (line.match(/^#\s+/)) continue;

        if (currentEntry) {
            currentEntry.bodyLines.push(line);
        }
    }

    if (currentEntry) entries.push(currentEntry);
    return entries;
}

/**
 * Convert body lines to HTML paragraphs and lists.
 */
function renderBody(bodyLines) {
    let html = '';
    let inList = false;
    let paragraphBuffer = [];

    function flushParagraph() {
        if (paragraphBuffer.length > 0) {
            const text = paragraphBuffer.join(' ').trim();
            if (text) {
                let formatted = escapeHtml(text);
                formatted = parseLinksFromMarkdown(formatted);
                formatted = parseMarkdown(formatted);
                html += `<p>${formatted}</p>`;
            }
            paragraphBuffer = [];
        }
    }

    for (const line of bodyLines) {
        const trimmed = line.trim();

        // Empty line: flush current paragraph
        if (!trimmed) {
            flushParagraph();
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            continue;
        }

        // List item
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            flushParagraph();
            if (!inList) {
                html += '<ul>';
                inList = true;
            }
            let itemText = trimmed.substring(2).trim();
            itemText = escapeHtml(itemText);
            itemText = parseLinksFromMarkdown(itemText);
            itemText = parseMarkdown(itemText);
            html += `<li>${itemText}</li>`;
            continue;
        }

        // Close list if we hit a non-list, non-empty line
        if (inList) {
            html += '</ul>';
            inList = false;
        }

        // Accumulate paragraph text
        paragraphBuffer.push(trimmed);
    }

    flushParagraph();
    if (inList) {
        html += '</ul>';
    }

    return html;
}

/**
 * Generate an accordion item for a FAQ/troubleshooting entry.
 * displayNumber: sequential 1-based number for display.
 * sourceNumber: original number from markdown, used for anchor ID.
 * section: 'faq' or 'troubleshooting' (for anchor prefix and data attribute).
 */
function generateAccordionItem(entry, displayNumber, section) {
    const anchorId = `${section}-${entry.number}`;
    const bodyHtml = renderBody(entry.bodyLines);

    return `
<div class="faq-item" data-section="${section}" id="${anchorId}">
    <button class="faq-question" data-umami-event="FAQ Page Expand" data-umami-event-question="${escapeHtml(entry.title)}">
        <span class="faq-number">${displayNumber}</span>
        <span class="faq-text">${escapeHtml(entry.title)}</span>
        <span class="material-symbols-rounded">expand_more</span>
    </button>
    <div class="faq-answer">
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

    if (faqEntries.length === 0) {
        throw new Error('No FAQ entries parsed — check the markdown format of questions.md');
    }
    if (troubleshootingEntries.length === 0) {
        throw new Error('No troubleshooting entries parsed — check the markdown format of troubleshooting.md');
    }

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

    if (!template.includes('{{FAQ_CONTENT}}')) {
        throw new Error('faq.html does not contain {{FAQ_CONTENT}} placeholder');
    }

    template = template.replace('{{FAQ_CONTENT}}', html);

    await fs.writeFile(faqPath, template, 'utf8');

    console.log('✨ FAQ page generated successfully!');
}

generateFaq().catch(err => {
    console.error('❌ FAQ generation failed:', err.message);
    process.exit(1);
});
