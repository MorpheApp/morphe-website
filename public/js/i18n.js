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

                // Set direction (RTL/LTR)
                this.applyDirection();

                // Remove loading class to show content
                document.documentElement.classList.remove('i18n-loading');

                window.dispatchEvent(new CustomEvent('i18nReady', {
                    detail: {
                        lang: this.currentLang,
                        hasTestimonials: !!this.translations.testimonials
                    }
                }));
            } catch (error) {
                console.error('Failed to initialize i18n:', error);
                // Show content even if i18n fails
                document.documentElement.classList.remove('i18n-loading');
            }
        }

        /**
         * Load supported locales configuration from JSON
         */
        async loadConfiguration() {
            try {
                const response = await fetch(LOCALES_CONFIG_PATH);

                if (!response.ok) {
                    throw new Error(`Failed to load locales configuration: ${response.status} ${response.statusText}`);
                }

                const config = await response.json();
                DEFAULT_LANGUAGE = config.default;
                SUPPORTED_LOCALES = config.supported;
                this.supportedLanguages = SUPPORTED_LOCALES.map(l => l.code);
                this.configLoaded = true;

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
            this.applyDirection();

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

            // Translate elements with data-i18n-link: replaces %s in translation with a link
            document.querySelectorAll('[data-i18n-link]').forEach(element => {
                const key = element.getAttribute('data-i18n-link');
                const href = element.getAttribute('data-i18n-link-href') || '#';
                const linkText = element.getAttribute('data-i18n-link-text') || href;
                const attrsRaw = element.getAttribute('data-i18n-link-attrs');
                let translation = this.translate(key);

                // Build extra attributes string
                let extraAttrs = '';
                if (attrsRaw) {
                    try {
                        const attrsObj = JSON.parse(attrsRaw);
                        extraAttrs = Object.entries(attrsObj)
                            .map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`)
                            .join(' ');
                    } catch (e) {
                        console.warn('data-i18n-link-attrs: invalid JSON on', key);
                    }
                }

                const linkHtml = `<a href="${href}" ${extraAttrs}>${linkText}</a>`;
                element.innerHTML = translation.replace('%s', linkHtml);
            });

            // Translate elements with data-i18n-links: replaces %1, %2, ... with multiple links
            // data-i18n-links is a JSON array: [{ href, text, attrs }, ...]
            // Link text can be overridden per-locale via translation keys: {key}-link1, {key}-link2, ...
            document.querySelectorAll('[data-i18n-links]').forEach(element => {
                const key = element.getAttribute('data-i18n-links');
                let translation = this.translate(key);

                try {
                    const links = JSON.parse(element.getAttribute('data-i18n-links-data') || '[]');
                    links.forEach((link, index) => {
                        const placeholder = `%${index + 1}`;
                        // Check for translated link text via {key}-link1, {key}-link2, ...
                        const textKey = `${key}-link${index + 1}`;
                        const translatedText = this.translate(textKey);
                        const linkText = (translatedText && translatedText !== textKey)
                            ? translatedText
                            : link.text;
                        let extraAttrs = '';
                        if (link.attrs) {
                            extraAttrs = Object.entries(link.attrs)
                                .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
                                .join(' ');
                        }
                        const linkHtml = `<a href="${link.href}" ${extraAttrs}>${linkText}</a>`;
                        translation = translation.replace(placeholder, linkHtml);
                    });
                } catch (e) {
                    console.warn('data-i18n-links-data: invalid JSON on', key);
                }

                element.innerHTML = translation;
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

            // Update lang-label spans in all dropdowns (footer trigger)
            const locale = SUPPORTED_LOCALES.find(l => l.code === this.currentLang);
            document.querySelectorAll('.lang-label').forEach(el => {
                if (locale) el.textContent = locale.name;
            });

            // Update selected state in all lang-menu-items
            document.querySelectorAll('.lang-menu-item').forEach(el => {
                el.classList.toggle('selected', el.getAttribute('data-code') === this.currentLang);
            });

            // Update HTML lang attribute
            // For region codes, use full code (e.g., pt-BR)
            document.documentElement.lang = this.currentLang;
        }

        applyDirection() {
            const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
            const lang = this.currentLang.split('-')[0];
            document.documentElement.dir = rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
        }

        // Close all open lang menus
        closeAllMenus() {
            const modal = document.getElementById('langPickerModal');
            if (modal) modal.classList.remove('open');
            
            // Remove active states from all triggers
            document.querySelectorAll('.lang-trigger, .m3-icon-btn').forEach(t => {
                t.classList.remove('modal-open');
            });
            document.querySelectorAll('.lang-trigger, .lang-trigger-compact').forEach(t => t.classList.remove('open'));
        }

        // Build the language picker grid inside the modal
        buildLangPicker() {
            const grid = document.getElementById('modalLangGrid');
            if (!grid) return;

            grid.innerHTML = ''; // Clear existing

            SUPPORTED_LOCALES.forEach((locale, index) => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'm3-lang-card';
                if (locale.code === this.currentLang) card.classList.add('selected');
                
                card.setAttribute('data-code', locale.code);
                card.style.setProperty('--i', index);
                
                card.innerHTML = `
                    <span class="material-symbols-rounded check-mark">check</span>
                    <span class="lang-name">${locale.name}</span>
                `;


                card.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Visual feedback: select the card immediately
                    grid.querySelectorAll('.m3-lang-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');

                    // Tactical delay to let the user see the selection "pop"
                    setTimeout(() => {
                        this.setLanguage(locale.code);
                        this.closeAllMenus();
                    }, 300);
                });


                grid.appendChild(card);
            });
        }

        setupLanguageSelector() {
            if (!this.configLoaded || SUPPORTED_LOCALES.length === 0) {
                console.error('Cannot setup language picker: configuration not loaded');
                return;
            }

            const modal = document.getElementById('langPickerModal');
            const triggers = [
                document.getElementById('langTriggerBar'),
                document.getElementById('langTriggerFooter')
            ];
            const closeBtn = document.getElementById('closeLangPicker');

            // Build the grid once
            this.buildLangPicker();

            // Setup triggers
            triggers.forEach(trigger => {
                if (!trigger) return;
                trigger.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Cleanup any existing active states first
                    triggers.forEach(t => t?.classList.remove('modal-open'));
                    
                    // Activate this trigger
                    trigger.classList.add('modal-open');
                    modal.classList.add('open');
                });
            });


            // Close logic
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.closeAllMenus());
            }

            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) this.closeAllMenus();
                });
            }

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeAllMenus();
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
