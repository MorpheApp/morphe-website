// Add Source page logic
// Handles Android intent deep link and state switching
(function () {
    'use strict';

    var params = new URLSearchParams(window.location.search);
    var repo   = params.get('github') || '';
    var name   = params.get('name') || '';

    // No github param - redirect home
    if (!repo) { window.location.href = '/'; return; }

    // Set source icon
    var githubUser = repo.split('/')[0];
    var iconImg = document.getElementById('source-icon');
    if (iconImg) {
        iconImg.src = 'http://api.morphe.software/v2/avatar/' + githubUser;
        iconImg.alt = githubUser;
    }

    window.addEventListener('load', function () {
        if (window.umami) {
            umami.track('Add Source', { user: githubUser });
        }
    });

    var url = 'https://github.com/' + repo;

    var isAndroid = /android/i.test(navigator.userAgent);

    // Populate source info card
    var match = url.match(/github\.com\/([^/?#]+\/[^/?#]+)/);
    document.getElementById('source-name').textContent = name || (match ? match[1] : url);
    document.getElementById('source-url').textContent  = url;

    // intent:// scheme - forces Chrome to fire a proper Android intent
    // (window.location.href with the same URL is ignored as "same page")
    var encodedRepo  = encodeURIComponent(repo);
    var encodedName  = name ? encodeURIComponent(name) : '';
    var intentParams = 'github=' + encodedRepo + (encodedName ? '&name=' + encodedName : '');
    var intentLink   = 'intent://morphe.software/add-source?' + intentParams +
        '#Intent;scheme=https;package=app.morphe.manager;S.browser_fallback_url=' +
        encodeURIComponent('https://morphe.software/') + ';end';

    function show(id) {
        document.querySelectorAll('.state').forEach(function (s) {
            s.classList.remove('active');
        });
        document.getElementById(id).classList.add('active');
    }

    // Apply i18n once it's ready, then show correct state
    function applyI18nAndShow() {
        if (window.i18n) {
            // Re-apply translations that need dynamic content
            // (static data-i18n attrs are handled by i18n.js automatically)
            document.getElementById('source-label').textContent =
                window.i18n.t('add-source.source-label');
        }

        if (isAndroid) {
            show('state-android');
            document.getElementById('btn-open').addEventListener('click', function (e) {
                e.preventDefault();
                show('state-success');
                window.location.href = intentLink;
            });
        } else {
            show('state-desktop');
        }
    }

    // Wait for i18n to be ready before showing states
    if (window.i18n && window.i18n.translations && Object.keys(window.i18n.translations).length) {
        applyI18nAndShow();
    } else {
        window.addEventListener('i18nReady', applyI18nAndShow);
        // Fallback: show after 1s even if i18n fails
        setTimeout(applyI18nAndShow, 1000);
    }
})();
