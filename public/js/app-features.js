/**
 * App Features Tabs Logic
 * Stripped of legacy inline CSS injection. Now strictly handles active class toggling
 * to allow the Material 3 Expressive CSS to handle grids, fades, and scale animations.
 */
(function () {
    'use strict';

    let currentIndex = 0;
    let dragStartX = 0;
    let isDragging = false;

    let tabs, pages, panelWrapper;

    function getCount() { return pages.length; }

    function goTo(index) {
        const count = getCount();
        if (count === 0) return;
        currentIndex = ((index % count) + count) % count;

        // Toggle Tab Active State
        tabs.forEach((tab, i) => {
            tab.classList.toggle('active', i === currentIndex);
            tab.setAttribute('aria-selected', i === currentIndex);
        });

        // Toggle Page Active State (CSS handles the grid display & fade animation)
        pages.forEach((page, i) => {
            if (i === currentIndex) {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
    }

    function next() { goTo(currentIndex + 1); }
    function prev() { goTo(currentIndex - 1); }

    function init() {
        tabs  = Array.from(document.querySelectorAll('.app-tab'));
        pages = Array.from(document.querySelectorAll('.app-features-page'));
        panelWrapper = document.querySelector('.app-features-panel-wrapper');

        if (!tabs.length || !pages.length) return;

        // Tab click listeners
        tabs.forEach((tab, i) => {
            tab.addEventListener('click', () => { goTo(i); });
        });

        // Swipe / drag on wrapper for mobile usability
        if (panelWrapper) {
            panelWrapper.addEventListener('touchstart', e => {
                isDragging = true;
                dragStartX = e.touches[0].clientX;
            }, { passive: true });

            panelWrapper.addEventListener('touchend', e => {
                if (!isDragging) return;
                isDragging = false;
                const delta = dragStartX - e.changedTouches[0].clientX;
                
                // Handle RTL swipe direction
                const isRTL = document.documentElement.dir === 'rtl';
                const normalizedDelta = isRTL ? -delta : delta;
                
                if (Math.abs(normalizedDelta) > 50) normalizedDelta > 0 ? next() : prev();
            });

            panelWrapper.addEventListener('mousedown', e => {
                isDragging = true;
                dragStartX = e.clientX;
                e.preventDefault(); // Prevent text selection
            });

            document.addEventListener('mouseup', e => {
                if (!isDragging) return;
                isDragging = false;
                const delta = dragStartX - e.clientX;
                
                // Handle RTL swipe direction
                const isRTL = document.documentElement.dir === 'rtl';
                const normalizedDelta = isRTL ? -delta : delta;
                
                if (Math.abs(normalizedDelta) > 50) normalizedDelta > 0 ? next() : prev();
            });
        }

        // Initialize first render without autoplay
        goTo(0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
