// i18n System for Morphe - Loads translations from JSON files
(function() {
    'use strict';

    const I18N_KEY = 'morphe-language';
    const SUPPORTED_LANGUAGES = ['en', 'uk', 'es', 'de', 'fr'];
    const DEFAULT_LANGUAGE = 'en';

    class I18n {
        constructor() {
            this.translations = {};
            this.currentLang = null;
            this.init();
        }

        async init() {
            this.currentLang = this.getLanguage();
            await this.loadTranslations(this.currentLang);
            this.applyTranslations();
            this.setupLanguageSelector();
        }

        getLanguage() {
            // Check saved preference
            const saved = localStorage.getItem(I18N_KEY);
            if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
                return saved;
            }

            // Check browser language
            const browserLang = navigator.language.slice(0, 2);
            if (SUPPORTED_LANGUAGES.includes(browserLang)) {
                return browserLang;
            }

            // Default to English
            return DEFAULT_LANGUAGE;
        }

        async loadTranslations(lang) {
            try {
                const response = await fetch(`/locales/${lang}.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load translations for ${lang}`);
                }
                this.translations = await response.json();
            } catch (error) {
                console.error('Error loading translations:', error);
                // Fallback to English if loading fails
                if (lang !== DEFAULT_LANGUAGE) {
                    const fallbackResponse = await fetch(`/locales/${DEFAULT_LANGUAGE}.json`);
                    this.translations = await fallbackResponse.json();
                }
            }
        }

        async setLanguage(lang) {
            if (!SUPPORTED_LANGUAGES.includes(lang)) return;

            this.currentLang = lang;
            localStorage.setItem(I18N_KEY, lang);
            await this.loadTranslations(lang);
            this.applyTranslations();

            // Reload testimonials with current language
            if (typeof window.reloadTestimonials === 'function') {
                window.reloadTestimonials();
            }
        }

        translate(key) {
            const keys = key.split('.');
            let value = this.translations;

            for (const k of keys) {
                if (value && typeof value === 'object') {
                    value = value[k];
                } else {
                    return key; // Return key if translation not found
                }
            }

            return value || key;
        }

        applyTranslations() {
            // Translate all elements with data-i18n attribute
            document.querySelectorAll('[data-i18n]').forEach(element => {
                const key = element.getAttribute('data-i18n');
                const translation = this.translate(key);

                // Check if the element is an input or textarea
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.value = translation;
                } else {
                    element.textContent = translation;
                }
            });

            // Translate elements with data-i18n-html for HTML content
            document.querySelectorAll('[data-i18n-html]').forEach(element => {
                const key = element.getAttribute('data-i18n-html');
                element.innerHTML = this.translate(key);
            });

            // Translate placeholders
            document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
                const key = element.getAttribute('data-i18n-placeholder');
                element.placeholder = this.translate(key);
            });

            // Translate aria-labels
            document.querySelectorAll('[data-i18n-aria]').forEach(element => {
                const key = element.getAttribute('data-i18n-aria');
                element.setAttribute('aria-label', this.translate(key));
            });

            // Translate titles
            document.querySelectorAll('[data-i18n-title]').forEach(element => {
                const key = element.getAttribute('data-i18n-title');
                element.title = this.translate(key);
            });

            // Update language selector
            const selector = document.getElementById('language-selector');
            if (selector) {
                selector.value = this.currentLang;
            }

            // Update HTML lang attribute
            document.documentElement.lang = this.currentLang;
        }

        setupLanguageSelector() {
            const selector = document.getElementById('language-selector');
            if (selector) {
                selector.value = this.currentLang;
                selector.addEventListener('change', (e) => {
                    this.setLanguage(e.target.value);
                });
            }
        }

        // Helper method for getting translations in JavaScript
        t(key) {
            return this.translate(key);
        }
    }

    // Initialize i18n when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.i18n = new I18n();
        });
    } else {
        window.i18n = new I18n();
    }
})();
