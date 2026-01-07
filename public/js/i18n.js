// i18n System for Morphe - Loads translations from JSON files
(function() {
    'use strict';

    const I18N_KEY = 'morphe-language';
    const SUPPORTED_LOCALES = [
    { code: 'en', name: 'English' },
    { code: 'es-ES', name: 'Español' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'pl-PL', name: 'Polski' },
    { code: 'uk-UA', name: 'Українська' },
    { code: 'it-IT', name: 'Italiano' },
    { code: 'nl-NL', name: 'Nederlands' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'pt-PT', name: 'Português (Portugal)' },
    { code: 'tr-TR', name: 'Türkçe' },
    { code: 'cs-CZ', name: 'Čeština' },
    { code: 'sk-SK', name: 'Slovenčina' },
    { code: 'zh-CN', name: '中文 (简体)' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' }
    ];
    const DEFAULT_LANGUAGE = 'en';

    class I18n {
        constructor() {
            this.translations = {};
            this.currentLang = null;
            this.supportedLanguages = SUPPORTED_LOCALES.map(l => l.code);
            this.init();
        }

        async init() {
            this.currentLang = this.getLanguage();
            await this.loadTranslations(this.currentLang);
            this.applyTranslations();
            this.setupLanguageSelector();
        }

        /**
         * Get the best matching language
         */
        getLanguage() {
            // Check saved preference
            const saved = localStorage.getItem(I18N_KEY);
            if (saved && this.supportedLanguages.includes(saved)) {
                return saved;
            }

            // Check browser language with region code
            const browserLangFull = navigator.language; // e.g., "pt-BR"
            if (this.supportedLanguages.includes(browserLangFull)) {
                return browserLangFull;
            }

            // Check browser language base (without region)
            const browserLangBase = browserLangFull.split('-')[0]; // e.g., "pt"

            // Try to find a regional variant
            const regionalVariant = this.supportedLanguages.find(
                lang => lang.startsWith(browserLangBase + '-')
            );
            if (regionalVariant) {
                return regionalVariant;
            }

            // Try base language
            if (this.supportedLanguages.includes(browserLangBase)) {
                return browserLangBase;
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

                // If testimonials section is missing, load from English
                if (!this.translations.testimonials && lang !== DEFAULT_LANGUAGE) {
                    console.log('Loading testimonials from English as fallback');
                    const enResponse = await fetch(`/locales/${DEFAULT_LANGUAGE}.json`);
                    const enTranslations = await enResponse.json();
                    if (enTranslations.testimonials) {
                        this.translations.testimonials = enTranslations.testimonials;
                    }
                }
            } catch (error) {
                console.error('Error loading translations:', error);

                // Fallback strategy for regional variants
                if (lang.includes('-')) {
                    const baseLang = lang.split('-')[0];
                    console.log(`Trying fallback to base language: ${baseLang}`);

                    try {
                        const fallbackResponse = await fetch(`/locales/${baseLang}.json`);
                        if (fallbackResponse.ok) {
                            this.translations = await fallbackResponse.json();
                            return;
                        }
                    } catch (fallbackError) {
                        console.error('Fallback also failed:', fallbackError);
                    }
                }

                // Final fallback to English
                if (lang !== DEFAULT_LANGUAGE) {
                    console.log(`Falling back to default language: ${DEFAULT_LANGUAGE}`);
                    const defaultResponse = await fetch(`/locales/${DEFAULT_LANGUAGE}.json`);
                    this.translations = await defaultResponse.json();
                }
            }
        }

        async setLanguage(lang) {
            if (!this.supportedLanguages.includes(lang)) return;

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
                    console.warn(`Translation key not found: ${key}`);
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
            // For region codes, use full code (e.g., pt-BR)
            document.documentElement.lang = this.currentLang;
        }

        setupLanguageSelector() {
            const selector = document.getElementById('language-selector');
            if (selector) {
                // Populate selector with supported languages
                selector.innerHTML = SUPPORTED_LOCALES.map(locale =>
                    `<option value="${locale.code}">${locale.name}</option>`
                ).join('');

                selector.value = this.currentLang;
                selector.addEventListener('change', (e) => {
                    this.setLanguage(e.target.value);
                });
            }
        }

        /**
         * Helper method for getting translations in JavaScript
         * @param {string} key - Translation key
         * @param {Object} params - Parameters for string interpolation
         */
        t(key, params = {}) {
            let translation = this.translate(key);

            // Simple string interpolation
            if (params && typeof translation === 'string') {
                Object.keys(params).forEach(param => {
                    translation = translation.replace(
                        new RegExp(`{{${param}}}`, 'g'),
                        params[param]
                    );
                });
            }

            return translation;
        }

        /**
         * Get current language code
         */
        getCurrentLanguage() {
            return this.currentLang;
        }

        /**
         * Get current language name
         */
        getCurrentLanguageName() {
            const locale = SUPPORTED_LOCALES.find(l => l.code === this.currentLang);
            return locale ? locale.name : this.currentLang;
        }

        /**
         * Get all supported languages
         */
        getSupportedLanguages() {
            return SUPPORTED_LOCALES;
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
