// i18n System for Morphe - Loads translations from JSON files
(function() {
    'use strict';

    const I18N_KEY = 'morphe-language';
    const LOCALES_CONFIG_PATH = '/locales/supported-locales.json';
    let DEFAULT_LANGUAGE = 'en';
    let SUPPORTED_LOCALES = [];

    class I18n {
        constructor() {
            this.translations = {};
            this.currentLang = null;
            this.supportedLanguages = [];
            this.configLoaded = false;
        }

        async init() {
            try {
                // Load configuration first
                await this.loadConfiguration();

                this.currentLang = this.getLanguage();
                await this.loadTranslations(this.currentLang);

                // Setup language selector after config is loaded
                this.setupLanguageSelector();

                // Apply translations after everything is ready
                this.applyTranslations();

                window.dispatchEvent(new CustomEvent('i18nReady', {
                    detail: {
                        lang: this.currentLang,
                        hasTestimonials: !!this.translations.testimonials
                    }
                }));
            } catch (error) {
                console.error('Failed to initialize i18n:', error);
            }
        }

        /**
         * Load supported locales configuration from JSON
         */
        async loadConfiguration() {
            try {
                console.log('Loading locales configuration from:', LOCALES_CONFIG_PATH);
                const response = await fetch(LOCALES_CONFIG_PATH);

                if (!response.ok) {
                    throw new Error(`Failed to load locales configuration: ${response.status} ${response.statusText}`);
                }

                const config = await response.json();
                DEFAULT_LANGUAGE = config.default;
                SUPPORTED_LOCALES = config.supported;
                this.supportedLanguages = SUPPORTED_LOCALES.map(l => l.code);
                this.configLoaded = true;

                console.log(`✓ Loaded ${this.supportedLanguages.length} supported locales:`, this.supportedLanguages);
            } catch (error) {
                console.error('Error loading locales configuration:', error);
                // Fallback to minimal configuration
                console.warn('Using fallback configuration with English only');
                DEFAULT_LANGUAGE = 'en';
                SUPPORTED_LOCALES = [{ code: 'en', name: 'English', region: null }];
                this.supportedLanguages = ['en'];
                this.configLoaded = true;
            }
        }

        /**
         * Get the best matching language
         */
        getLanguage() {
            if (!this.configLoaded) {
                console.warn('Configuration not loaded yet, using default');
                return DEFAULT_LANGUAGE;
            }

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

            // Default to configured default language
            return DEFAULT_LANGUAGE;
        }

        async loadTranslations(lang) {
            try {
                const response = await fetch(`/locales/${lang}.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load translations for ${lang}`);
                }
                this.translations = await response.json();

                // If testimonials section is missing, load from default language
                if (!this.translations.testimonials && lang !== DEFAULT_LANGUAGE) {
                    console.log(`Loading testimonials from ${DEFAULT_LANGUAGE} as fallback`);
                    const defaultResponse = await fetch(`/locales/${DEFAULT_LANGUAGE}.json`);
                    const defaultTranslations = await defaultResponse.json();
                    if (defaultTranslations.testimonials) {
                        this.translations.testimonials = defaultTranslations.testimonials;
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

                // Final fallback to default language
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

            window.dispatchEvent(new CustomEvent('i18nLanguageChanged', {
                detail: {
                    lang: this.currentLang,
                    hasTestimonials: !!this.translations.testimonials
                }
            }));
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
            if (!selector) {
                console.warn('Language selector element not found');
                return;
            }

            if (!this.configLoaded || SUPPORTED_LOCALES.length === 0) {
                console.error('Cannot setup language selector: configuration not loaded');
                return;
            }

            // Populate selector with supported languages
            console.log('Populating language selector with', SUPPORTED_LOCALES.length, 'locales');
            selector.innerHTML = SUPPORTED_LOCALES.map(locale =>
                `<option value="${locale.code}">${locale.name}</option>`
            ).join('');

            selector.value = this.currentLang;
            selector.addEventListener('change', (e) => {
                this.setLanguage(e.target.value);
            });
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
            window.i18n.init();
        });
    } else {
        window.i18n = new I18n();
        window.i18n.init();
    }
})();
