// App Features Carousel — configuration constants
// To add a new app: add an entry to APP_CONFIG
const APP_CONFIG = {
    // Autoplay interval in milliseconds. Set to 0 to disable autoplay.
    AUTOPLAY_MS: 0,

    // Per-app accent colors (start of gradient)
    apps: {
        youtube:  { accent: '#FF0033' },
        ytmusic:  { accent: '#FF8C3E' },
        reddit:   { accent: '#FF4500' },
    }
};

// Carousel logic
(function () {
    'use strict';

    const AUTOPLAY_MS = APP_CONFIG.AUTOPLAY_MS;

    let currentIndex = 0;
    let autoplayTimer = null;

    let tabs, pages, panel;

    function getCount() { return pages.length; }

    function applyAppTheme(appId) {
        const cfg = APP_CONFIG.apps[appId];
        // The section owns --accent; the tab pill and the icon tiles read it
        const section = panel.closest('.features-section');
        if (section && cfg) section.style.setProperty('--accent', cfg.accent);
        const group = tabs[0] && tabs[0].parentElement;
        if (group && window.kit) window.kit.placePill(group);
    }

    function goTo(index, animate = true) {
        const count = getCount();
        currentIndex = ((index % count) + count) % count;

        tabs.forEach((tab, i) => {
            tab.classList.toggle('active', i === currentIndex);
            tab.setAttribute('aria-selected', i === currentIndex);
        });

        // Handle RTL direction
        const isRTL = document.documentElement.dir === 'rtl';
        const translateX = isRTL ? currentIndex * 100 : -currentIndex * 100;

        panel.style.transition = animate
            ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'none';
        panel.style.transform = `translateX(${translateX}%)`;

        // Apply per-app theme after transition settles
        const appId = pages[currentIndex]?.dataset.app;
        if (appId) applyAppTheme(appId);
    }

    function next() { goTo(currentIndex + 1); }
    function prev() { goTo(currentIndex - 1); }

    function startAutoplay() {
        stopAutoplay();
        if (!AUTOPLAY_MS) return;
        autoplayTimer = setInterval(next, AUTOPLAY_MS);
    }
    function stopAutoplay() { clearInterval(autoplayTimer); }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    function init() {
        tabs  = Array.from(document.querySelectorAll('.app-tab'));
        pages = Array.from(document.querySelectorAll('.app-features-page'));
        panel = document.querySelector('.app-features-panel');

        if (!tabs.length || !panel) return;

        // Set panel as flex row; each page = full width
        panel.style.display = 'flex';
        panel.style.width = '100%';
        panel.style.willChange = 'transform';

        pages.forEach(page => {
            page.style.flex = '0 0 100%';
            page.style.minWidth = '0';
            page.style.boxSizing = 'border-box';
            page.style.padding = '4px 12px';
            page.classList.add('active');
            page.style.display = 'flex';
            page.style.flexDirection = 'column';
            page.style.gap = 'var(--spacing-lg)';
        });

        // Tab clicks
        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => { goTo(i); resetAutoplay(); });
        });

        // Initial render
        goTo(0, false);
        startAutoplay();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
