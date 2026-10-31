// Sets the theme before first paint so the page never flashes the wrong one
(function () {
    'use strict';
    var theme;
    try {
        theme = localStorage.getItem('morphe-theme');
    } catch (e) { /* storage blocked */ }
    if (theme !== 'light' && theme !== 'dark') {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
})();
