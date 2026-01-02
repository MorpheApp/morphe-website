// Theme Management System
(function() {
    'use strict';

    const THEME_KEY = 'morphe-theme';
    const THEMES = {
        LIGHT: 'light',
        DARK: 'dark'
    };

    class ThemeManager {
        constructor() {
            this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            this.currentTheme = this.getSavedTheme();
            this.init();
        }

        init() {
            // Apply theme immediately to prevent flash
            this.applyTheme(this.currentTheme);

            // Set up theme toggle button
            this.setupThemeToggle();

            // Listen for system theme changes
            this.mediaQuery.addEventListener('change', () => {
                if (!localStorage.getItem(THEME_KEY)) {
                    const systemTheme = this.getSystemTheme();
                    this.applyTheme(systemTheme);
                }
            });
        }

        getSavedTheme() {
            const saved = localStorage.getItem(THEME_KEY);
            if (saved === THEMES.LIGHT || saved === THEMES.DARK) {
                return saved;
            }
            return this.getSystemTheme();
        }

        saveTheme(theme) {
            localStorage.setItem(THEME_KEY, theme);
        }

        getSystemTheme() {
            return this.mediaQuery.matches ? THEMES.DARK : THEMES.LIGHT;
        }

        applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            this.updateThemeIcon(theme);
        }

        toggleTheme() {
            const next = this.currentTheme === THEMES.DARK
                ? THEMES.LIGHT
                : THEMES.DARK;

            this.currentTheme = next;
            localStorage.setItem(THEME_KEY, next);
            this.applyTheme(next);
        }

        updateThemeIcon(theme) {
            const sunIcon = document.getElementById('theme-icon-sun');
            const moonIcon = document.getElementById('theme-icon-moon');

            if (!sunIcon || !moonIcon) return;

            if (theme === THEMES.DARK) {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                moonIcon.classList.add('hidden');
                sunIcon.classList.remove('hidden');
            }
        }

        setupThemeToggle() {
            const toggle = document.getElementById('theme-toggle');
            if (toggle) {
                toggle.addEventListener('click', () => {
                    this.toggleTheme();
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
