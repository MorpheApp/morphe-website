// Language Preloader - prevents flash of wrong language
// This must be loaded synchronously in <head> before any content renders
// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Run 'npm run generate-i18n-keys' to update this file

(function() {
    'use strict';

    const SUPPORTED_LOCALES = ['en', 'cs-CZ', 'de-DE', 'es-ES', 'fr-FR', 'it-IT', 'nl-NL', 'pl-PL', 'pt-BR', 'pt-PT', 'ru-RU', 'sk-SK', 'tr-TR', 'uk-UA', 'vi-VN', 'ja-JP', 'ko-KR', 'zh-CN'];

    const STORAGE_KEY = 'morphe-language';

    try {
        let lang = 'en';

        // Check saved preference
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && SUPPORTED_LOCALES.includes(saved)) {
            lang = saved;
        } else {
            // Detect from browser
            const browserLang = navigator.language;

            if (SUPPORTED_LOCALES.includes(browserLang)) {
                lang = browserLang;
            } else {
                const base = browserLang.split('-')[0];
                const regional = SUPPORTED_LOCALES.find(l => l.startsWith(base + '-'));

                if (regional) {
                    lang = regional;
                } else if (SUPPORTED_LOCALES.includes(base)) {
                    lang = base;
                }
            }
        }

        // Set language attribute immediately
        document.documentElement.lang = lang;

        // Hide content until i18n loads
        document.documentElement.classList.add('i18n-loading');

    } catch (e) {
        console.error('Language preload failed:', e);
    }
})();
