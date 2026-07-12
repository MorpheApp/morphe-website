// Add Source page logic
// Handles Android intent deep link and state switching
(function () {
    'use strict';

    // Blocked patch sources ('provider=owner/repo'). The provider prefix keeps
    // GitHub and GitLab namespaces separate. Client-side only, so a server-side
    // check is needed for tamper-proof enforcement.
    // The xyz-user entry is a permanent smoke-test for the blocked state.
    var BLOCKED_REPOS = [
        'github=xyz-user/malicious-repo'
    ];

    var params    = new URLSearchParams(window.location.search);
    var githubRepo = params.get('github') || '';
    var gitlabRepo = params.get('gitlab') || '';
    var name       = params.get('name') || '';

    var isGitLab = !!gitlabRepo;
    var repo     = gitlabRepo || githubRepo;

    // No repo param - redirect home
    if (!repo) { window.location.href = '/'; return; }

    var isDevelopment = repo === 'xyz-user/xyz-patches';
    var providerKey   = (isGitLab ? 'gitlab' : 'github') + '=' + repo.toLowerCase();
    var isBlocked     = BLOCKED_REPOS.indexOf(providerKey) !== -1;

    var repoOwner = repo.split('/')[0];

    // Set source icon
    var iconImg = document.getElementById('source-icon');
    if (iconImg) {
        iconImg.src = 'http://api.morphe.software/v2/avatar/' + repoOwner
        iconImg.alt = repoOwner;
    }

    window.addEventListener('load', function () {
        if (window.umami) {
            umami.track('Add Source', {
                user: repoOwner,
                provider: isGitLab ? 'gitlab' : 'github',
                blocked: isBlocked
            });
        }
    });

    var url = isGitLab
        ? 'https://gitlab.com/' + repo
        : 'https://github.com/' + repo;

    var isAndroid = /android/i.test(navigator.userAgent);

    // Populate source info card
    var match = url.match(/(?:github|gitlab)\.com\/([^/?#]+\/[^/?#]+)/);
    var urlEl = document.getElementById('source-url');
    if (urlEl) urlEl.textContent = url;
    var blockedUrlEl = document.getElementById('blocked-source-url');
    if (blockedUrlEl) blockedUrlEl.textContent = url;

    // Custom scheme `morphe://add-source` is used so browsers never intercept
    // https://morphe.software/add-source directly and the website always runs
    // its validation before Manager is launched.
    var encodedRepo  = encodeURIComponent(repo);
    var encodedName  = name ? encodeURIComponent(name) : '';
    var repoParam    = isGitLab ? 'gitlab' : 'github';
    var intentParams = repoParam + '=' + encodedRepo + (encodedName ? '&name=' + encodedName : '');
    var intentLink   = 'intent://add-source?' + intentParams +
        '#Intent;scheme=morphe;package=app.morphe.manager;S.browser_fallback_url=' +
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

        if (isBlocked) {
            show('state-blocked');
        } else if (isDevelopment) {
            show('state-development');
            var btnDevBack = document.getElementById('btn-dev-back');
            if (btnDevBack) {
                btnDevBack.addEventListener('click', function (e) {
                    if (window.history.length > 1) {
                        e.preventDefault();
                        window.history.back();
                    }
                });
            }
        } else if (isAndroid) {
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
