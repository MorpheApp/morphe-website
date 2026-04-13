// Hero morphing headline

(function () {
    'use strict';

    const APP_KEYS = [
        'hero.title-highlight-youtube',
        'hero.title-highlight-ytmusic',
        'hero.title-highlight-reddit',
        'hero.title-highlight', // final resting state
    ];

    const HOLD_MS            = 2600; // ms each label is fully visible
    const MORPH_MS           = 700;  // blur-morph transition duration
    const PAUSE_BEFORE_FIRST = 1800; // initial pause before first swap

    let currentIndex = 0;
    let timer        = null;
    let spanEl       = null;
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

    function morphTo(index) {
        if (!spanEl) return;

        spanEl.classList.add('morph-out');

        setTimeout(() => {
            currentIndex = index;
            spanEl.textContent = getLabel(index);
            spanEl.classList.replace('morph-out', 'morph-in');

            requestAnimationFrame(() => requestAnimationFrame(() => {
                spanEl.classList.remove('morph-in');
            }));

            const next = index + 1;
            if (next < APP_KEYS.length) {
                timer = setTimeout(() => morphTo(next), HOLD_MS);
            } else {
                running = false;
            }
        }, MORPH_MS);
    }

    function init() {
        if (running) return;
        spanEl = document.querySelector('.gradient-text[data-i18n="hero.title-highlight"]');
        if (!spanEl) return;
        spanEl.classList.add('hero-morph-text');
        running = true;
        timer = setTimeout(() => morphTo(0), PAUSE_BEFORE_FIRST);
    }

    function stop() {
        running = false;
        clearTimeout(timer);
        spanEl?.classList.remove('hero-morph-text', 'morph-out', 'morph-in');
    }

    window.addEventListener('i18nReady', init);

    window.addEventListener('i18nLanguageChanged', () => {
        if (spanEl) spanEl.textContent = getLabel(currentIndex);
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
            const next = currentIndex + 1;
            if (next < APP_KEYS.length) timer = setTimeout(() => morphTo(next), HOLD_MS);
        }
    });

    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    mq.addEventListener('change', e => e.matches ? stop() : init());

})();
