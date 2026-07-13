// Add Source page logic
// Handles Android intent deep link and state switching
(function () {
    'use strict';

    // Remote blocklist. Fails open on network error since Manager enforces authoritatively.
    var BLOCKLIST_URL = 'https://api.morphe.software/v2/blocked-sources';

    function fetchBlocklist() {
        return fetch(BLOCKLIST_URL, { cache: 'no-store' })
            .then(function (res) { return res.ok ? res.json() : {}; })
            .then(function (data) {
                var entries = (data && Array.isArray(data.blocked)) ? data.blocked : [];
                var byKey = new Map();
                entries.forEach(function (e) {
                    if (e && e.provider && e.repo) {
                        var key = (e.provider + '=' + e.repo).trim().toLowerCase();
                        byKey.set(key, { reason: e.reason || null });
                    }
                });
                return { entries: byKey, updatedAt: (data && data.updated_at) || null };
            })
            .catch(function () { return { entries: new Map(), updatedAt: null }; });
    }

    var blocklistPromise = fetchBlocklist();

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
                provider: isGitLab ? 'gitlab' : 'github'
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

    // Known reason codes get localized labels; unknown values fall through as-is.
    var KNOWN_REASONS = ['impersonation', 'malware', 'tos', 'test', 'dropped'];

    function reasonLabel(reason) {
        if (!reason) return null;
        var slug = String(reason).trim().toLowerCase();
        if (!slug) return null;
        if (KNOWN_REASONS.indexOf(slug) !== -1 && window.i18n) {
            return window.i18n.t('add-source.blocked-reason-' + slug);
        }
        return slug.charAt(0).toUpperCase() + slug.slice(1);
    }

    function formatUpdatedAt(iso) {
        if (!iso) return null;
        var date = new Date(iso);
        if (isNaN(date.getTime())) return null;
        var locale = document.documentElement.lang || undefined;
        var formatted;
        try {
            formatted = new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date);
        } catch (e) {
            formatted = date.toLocaleDateString();
        }
        return window.i18n
            ? window.i18n.t('add-source.blocklist-updated', { date: formatted })
            : 'Blocklist updated ' + formatted;
    }

    function populateBlockedMeta(reason, updatedAt) {
        var reasonEl  = document.getElementById('blocked-reason');
        var valueEl   = document.getElementById('blocked-reason-value');
        var updatedEl = document.getElementById('blocked-updated');
        var label     = reasonLabel(reason);
        if (label) {
            valueEl.textContent = label;
            reasonEl.hidden = false;
        }
        var updatedText = formatUpdatedAt(updatedAt);
        if (updatedText) {
            updatedEl.textContent = updatedText;
            updatedEl.hidden = false;
        }
    }

    // Apply i18n once it's ready, then wait for the blocklist before showing the state.
    function applyI18nAndShow() {
        if (window.i18n) {
            // Re-apply translations that need dynamic content
            // (static data-i18n attrs are handled by i18n.js automatically)
            document.getElementById('source-label').textContent =
                window.i18n.t('add-source.source-label');
        }

        blocklistPromise.then(function (blocklist) {
            var entry = blocklist.entries.get(providerKey);
            renderState(!!entry, entry ? entry.reason : null, blocklist.updatedAt);
        });
    }

    function renderState(isBlocked, reason, updatedAt) {
        if (window.umami && isBlocked) {
            umami.track('Add Source Blocked', {
                user: repoOwner,
                repo: providerKey,
                reason: reason || 'unspecified'
            });
        }

        if (isBlocked) {
            populateBlockedMeta(reason, updatedAt);
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
