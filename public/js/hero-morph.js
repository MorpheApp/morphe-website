// Hero headline: wipes through the app names once, then settles on the general label
(function () {
    'use strict';

    const APP_KEYS = [
        'hero.title-highlight-youtube',
        'hero.title-highlight-ytmusic',
        'hero.title-highlight-reddit',
        'hero.title-highlight',
    ];

    let swap = null;
    let label = null;

    function t(key) {
        if (window.i18n && typeof window.i18n.translate === 'function') {
            const v = window.i18n.translate(key);
            return v && v !== key ? v : null;
        }
        return null;
    }

    function labels() {
        return APP_KEYS.map(key => t(key) || t('hero.title-highlight') || 'Android Experience');
    }

    function init() {
        if (swap || !window.kit) return;
        const original = document.querySelector('.gradient-text[data-i18n="hero.title-highlight"]');
        if (!original) return;

        label = document.createElement('span');
        label.className = 'word-swap';
        label.setAttribute('aria-live', 'polite');
        const word = document.createElement('span');
        word.className = 'word';
        word.textContent = original.textContent;
        label.appendChild(word);
        original.replaceWith(label);

        swap = window.kit.wordSwap(label, labels, { hold: 1800, loop: false, startIndex: -1 }).start(2200);
    }

    window.addEventListener('i18nReady', init);
    window.addEventListener('i18nLanguageChanged', () => {
        if (!label || !swap) return;
        const list = labels();
        swap.set(swap.index < 0 ? list[list.length - 1] : list[Math.min(swap.index, list.length - 1)]);
    });

    // i18nReady may have fired before this script ran
    if (document.readyState !== 'loading') {
        setTimeout(() => { if (window.i18n?.currentLang) init(); }, 100);
    }
})();
