// Theme Management System
(function() {
    'use strict';

    const THEME_KEY = 'morphe-theme';
    const THEMES = {
        LIGHT: 'light',
        DARK: 'dark',
        AUTO: 'auto'
    };

    class ThemeManager {
        constructor() {
            this.currentTheme = this.getSavedTheme();
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.init();
        }

        init() {
            // Apply theme immediately to prevent flash
            this.applyTheme(this.currentTheme);

            // Set up theme toggle button
            this.setupThemeToggle();

            // Listen for system theme changes
            this.mediaQuery.addEventListener('change', (e) => {
                if (this.currentTheme === THEMES.AUTO) {
                    this.applyTheme(THEMES.AUTO);
                }
            });
        }

        getSavedTheme() {
            const saved = localStorage.getItem(THEME_KEY);
            return saved || THEMES.AUTO;
        }

        saveTheme(theme) {
            localStorage.setItem(THEME_KEY, theme);
        }

        getSystemTheme() {
            return this.mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
        }

        applyTheme(theme) {
            let actualTheme = theme;

            if (theme === THEMES.AUTO) {
                actualTheme = this.getSystemTheme();
            }

            document.documentElement.setAttribute('data-theme', actualTheme);
            this.updateThemeIcon(theme);
        }

        cycleTheme() {
            const themes = [THEMES.LIGHT, THEMES.DARK, THEMES.AUTO];
            const currentIndex = themes.indexOf(this.currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;

            this.currentTheme = themes[nextIndex];
            this.saveTheme(this.currentTheme);
            this.applyTheme(this.currentTheme);
        }

        updateThemeIcon(theme) {
            const sunIcon = document.getElementById('theme-icon-sun');
            const moonIcon = document.getElementById('theme-icon-moon');
            const autoIcon = document.getElementById('theme-icon-auto');

            if (!sunIcon || !moonIcon || !autoIcon) return;

            // Hide all icons
            [sunIcon, moonIcon, autoIcon].forEach(icon => {
                icon.classList.remove('visible');
                icon.classList.add('hidden');
            });

            // Show appropriate icon
            let iconToShow;
            switch(theme) {
                case THEMES.LIGHT:
                    iconToShow = sunIcon;
                    break;
                case THEMES.DARK:
                    iconToShow = moonIcon;
                    break;
                case THEMES.AUTO:
                    iconToShow = autoIcon;
                    break;
            }

            if (iconToShow) {
                iconToShow.classList.remove('hidden');
                iconToShow.classList.add('visible');
            }
        }

        setupThemeToggle() {
            const toggle = document.getElementById('theme-toggle');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    this.cycleTheme();
                });
            }
        }
    }

    // Initialize theme manager when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.themeManager = new ThemeManager();
        });
    } else {
        window.themeManager = new ThemeManager();
    }
})();
