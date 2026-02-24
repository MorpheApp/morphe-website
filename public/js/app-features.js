// App Features Carousel — configuration constants
// To add a new app: add an entry to APP_CONFIG
const APP_CONFIG = {
    // Shared gradient endpoints (mid + end are the same for all apps)
    GRADIENT_MID: '#1E5AA8',
    GRADIENT_END: '#00AFAE',

    // Autoplay interval in milliseconds. Set to 0 to disable autoplay.
    AUTOPLAY_MS: 0,

    // Per-app accent colors (start of gradient)
    apps: {
        youtube:  { accent: '#FF0033' },
        ytmusic:  { accent: '#FF8C3E' },
        reddit:   { accent: '#FF4500' },
    }
};

// Build a CSS gradient string for a given app id
function appGradient(appId) {
    const cfg = APP_CONFIG.apps[appId];
    if (!cfg) return `linear-gradient(135deg, ${APP_CONFIG.GRADIENT_MID}, ${APP_CONFIG.GRADIENT_END})`;
    return `linear-gradient(135deg, ${cfg.accent}, ${APP_CONFIG.GRADIENT_MID}, ${APP_CONFIG.GRADIENT_END})`;
}

// Carousel logic
(function () {
    'use strict';

    const AUTOPLAY_MS = APP_CONFIG.AUTOPLAY_MS;

    let currentIndex = 0;
    let autoplayTimer = null;
    let dragStartX = 0;
    let isDragging = false;

    let tabs, pages, panel;

    function getCount() { return pages.length; }

    function applyAppTheme(appId) {
        const gradient = appGradient(appId);

        // Active tab background
        tabs.forEach(tab => {
            if (tab.dataset.app === appId) {
                tab.style.background = gradient;
                tab.style.borderColor = 'transparent';
                tab.style.color = 'white';
                tab.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
            } else {
                tab.style.background = '';
                tab.style.borderColor = '';
                tab.style.color = '';
                tab.style.boxShadow = '';
            }
        });

        // Feature slide icons on the active page
        const activePage = pages[currentIndex];
        if (activePage) {
            activePage.querySelectorAll('.feature-slide-icon').forEach(icon => {
                icon.style.background = gradient;
            });
        }
    }

    function goTo(index, animate = true) {
        const count = getCount();
        currentIndex = ((index % count) + count) % count;

        tabs.forEach((tab, i) => {
            tab.classList.toggle('active', i === currentIndex);
            tab.setAttribute('aria-selected', i === currentIndex);
        });

        panel.style.transition = animate
            ? 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'none';
        panel.style.transform = `translateX(-${currentIndex * 100}%)`;

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

        // Swipe / drag on wrapper
        const wrapper = panel.parentElement;

        wrapper.addEventListener('touchstart', e => {
            isDragging = true;
            dragStartX = e.touches[0].clientX;
            stopAutoplay();
        }, { passive: true });

        wrapper.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            const delta = dragStartX - e.changedTouches[0].clientX;
            if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
            startAutoplay();
        });

        wrapper.addEventListener('mousedown', e => {
            isDragging = true;
            dragStartX = e.clientX;
            stopAutoplay();
            e.preventDefault();
        });

        document.addEventListener('mouseup', e => {
            if (!isDragging) return;
            isDragging = false;
            const delta = dragStartX - e.clientX;
            if (Math.abs(delta) > 40) delta > 0 ? next() : prev();
            startAutoplay();
        });

        wrapper.addEventListener('mouseenter', stopAutoplay);
        wrapper.addEventListener('mouseleave', () => { if (!isDragging) startAutoplay(); });

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
