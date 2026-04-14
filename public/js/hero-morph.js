// Hero morphing headline

(function () {
    'use strict';

    const APP_KEYS = [
        'hero.title-highlight-youtube',
        'hero.title-highlight-ytmusic',
        'hero.title-highlight-reddit',
        'hero.title-highlight',
    ];

    const HOLD_MS            = 2600;
    const CROSSFADE_MS       = 600; // must match CSS transition duration
    const PAUSE_BEFORE_FIRST = 1800;

    let currentIndex = 0;
    let timer        = null;
    let wrapEl       = null;
    let current      = null; // fully visible layer
    let next         = null; // hidden incoming layer
    let sizer        = null; // invisible width-keeper
    let running      = false;

    function t(key) {
        if (window.i18n && typeof window.i18n.translate === 'function') {
            const v = window.i18n.translate(key);
            return (v && v !== key) ? v : null;
        }
        return null;
    }

    function getLabel(index) {
        return t(APP_KEYS[index]) || t('hero.title-highlight') || 'Android Experience';
    }

    function buildDom() {
        const original = document.querySelector('.gradient-text[data-i18n="hero.title-highlight"]');
        if (!original) return false;

        wrapEl = document.createElement('span');
        wrapEl.className = 'hero-morph-wrap';

        // Keeps the wrapper at the correct width for the active label
        sizer = document.createElement('span');
        sizer.className = 'hero-morph-sizer';
        sizer.setAttribute('aria-hidden', 'true');
        sizer.textContent = original.textContent;

        current = document.createElement('span');
        current.className = 'hero-morph-layer visible';
        current.setAttribute('aria-live', 'polite');
        current.textContent = original.textContent;

        next = document.createElement('span');
        next.className = 'hero-morph-layer hidden';
        next.setAttribute('aria-hidden', 'true');

        wrapEl.appendChild(sizer);
        wrapEl.appendChild(current);
        wrapEl.appendChild(next);
        original.replaceWith(wrapEl);
        return true;
    }

    function crossfadeTo(index) {
        if (!wrapEl) return;

        currentIndex = index;
        const label  = getLabel(index);

        sizer.textContent = label;
        next.textContent = label;
        next.removeAttribute('aria-hidden');

        // Two rAFs: first commits textContent paint, second starts transitions
        requestAnimationFrame(() => requestAnimationFrame(() => {
            current.classList.replace('visible', 'hidden');
            next.classList.replace('hidden', 'visible');

            setTimeout(() => {
                // Swap refs so "current" always points to the visible layer
                [current, next] = [next, current];

                // Reset the now-invisible layer instantly (no transition)
                next.style.transition = 'none';
                next.classList.replace('visible', 'hidden');
                next.textContent = '';
                next.setAttribute('aria-hidden', 'true');
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    next.style.transition = '';
                }));

                const nextIndex = index + 1;
                if (nextIndex < APP_KEYS.length) {
                    timer = setTimeout(() => crossfadeTo(nextIndex), HOLD_MS);
                } else {
                    // Animation done — remove the unused next layer to clean up DOM
                    next.remove();
                    next = null;
                    running = false;
                }
            }, CROSSFADE_MS + 60);
        }));
    }

    function init() {
        if (running) return;
        if (!buildDom()) return;
        running = true;
        timer = setTimeout(() => crossfadeTo(0), PAUSE_BEFORE_FIRST);
    }

    function stop() {
        running = false;
        clearTimeout(timer);
    }

    window.addEventListener('i18nReady', init);

    window.addEventListener('i18nLanguageChanged', () => {
        if (current) current.textContent = getLabel(currentIndex);
    });

    // Fallback if i18nReady already fired before this script loaded
    if (document.readyState !== 'loading') {
        setTimeout(() => { if (window.i18n?.currentLang) init(); }, 100);
    }

    // Pause when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearTimeout(timer);
        } else if (running) {
            const nextIndex = currentIndex + 1;
            if (nextIndex < APP_KEYS.length) {
                timer = setTimeout(() => crossfadeTo(nextIndex), HOLD_MS);
            }
        }
    });

    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    mq.addEventListener('change', e => e.matches ? stop() : init());

})();
