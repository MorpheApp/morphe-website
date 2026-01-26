// Theme Preloader - prevents flash of wrong theme
// This must be loaded synchronously in <head> before any content renders
(function() {
    'use strict';

    try {
        const theme = localStorage.getItem('morphe-theme') || 'auto';
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const actual = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
        document.documentElement.setAttribute('data-theme', actual);
    } catch (e) {
        console.error('Theme preload failed:', e);
    }
})();
