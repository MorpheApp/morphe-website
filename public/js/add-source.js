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

    // Host marks cut into the avatar's corner, from the Simple Icons set
    var GITHUB_MARK = '<svg viewBox="0 0 24 24"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.8.1 3.1.8.9 1.3 1.9 1.3 3.1 0 4.7-2.8 5.7-5.5 6 .5.4.9 1.1.9 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"/></svg>';
    var GITLAB_MARK = '<svg viewBox="0 0 24 24"><path d="m23.6 9.6-.03-.09-3.26-8.5a.85.85 0 0 0-1.62.06l-2.2 6.74H7.5L5.3 1.07a.85.85 0 0 0-1.62-.06L.43 9.5l-.03.09a6.06 6.06 0 0 0 2 7l.02.01.03.02 4.98 3.73 2.46 1.86 1.5 1.13a1 1 0 0 0 1.22 0l1.5-1.13 2.46-1.86 5-3.75.02-.01a6.06 6.06 0 0 0 2-7"/></svg>';

    var params    = new URLSearchParams(window.location.search);
    var githubRepo = params.get('github') || '';
    var gitlabRepo = params.get('gitlab') || '';
    var name       = params.get('name') || '';
    // App the link was opened for, by package and by name. Manager adds the source for it alone,
    // or for its universal patches alone when the bundles site passes UNIVERSAL_APP in its place
    var UNIVERSAL_APP = '__universal__';
    var appPackage = params.get('app') || '';
    var appName    = params.get('appName') || '';
    var appIcon    = params.get('appIcon') || '';

    var isGitLab = !!gitlabRepo;
    var repo     = gitlabRepo || githubRepo;

    // No repo param - redirect home
    if (!repo) { window.location.href = '/'; return; }

    var isDevelopment = repo === 'xyz-user/xyz-patches';
    var providerKey   = (isGitLab ? 'gitlab' : 'github') + '=' + repo.toLowerCase();

    var repoOwner = repo.split('/')[0];

    function getTrackingData() {
        var data = {
            repo: repo.toLowerCase(),
            provider: isGitLab ? 'gitlab' : 'github'
        };
        if (appPackage) data.app = appPackage;
        return data;
    }

    // Set source icon
    var iconImg = document.getElementById('source-icon');
    if (iconImg) {
        var avatarUrl = 'https://api.morphe.software/v2/avatar/' + repoOwner;
        iconImg.src = avatarUrl;
        iconImg.alt = repoOwner;

        // Check if the repo owner is not validated.
        fetch(avatarUrl).then(function (res) {
            var warning = document.getElementById('trust-warning');
            if (warning) {
                // If redirect is for a image on this site, then repo owner is unknown.
                var isUnknown = res.url.indexOf('morphe.software') >= 0;
                warning.style.display = isUnknown ? 'flex' : 'none';
            }
        })
    }

    window.addEventListener('load', function () {
        if (window.umami) {
            umami.track('Add Source', getTrackingData());
        }
    });

    var url = isGitLab
        ? 'https://gitlab.com/' + repo
        : 'https://github.com/' + repo;

    var isAndroid = (function() {
        var ua = navigator.userAgent;
        if (/android/i.test(ua)) return true;

        // Check for Android in "Desktop site" mode
        if (navigator.userAgentData && navigator.userAgentData.platform === 'Android') return true;

        return false;
    })();

    if (isAndroid) {
        document.body.classList.add('is-mobile-detected');
    }

    // Header and rows the way Manager shows them: the repository as the title, its owner under it
    var match = url.match(/(?:github|gitlab)\.com\/([^/?#]+\/[^/?#]+)/);
    var repoPath = match ? match[1] : repo;
    var host = isGitLab ? 'gitlab.com' : 'github.com';
    document.getElementById('source-name').textContent = name || repoPath.split('/')[1] || repoPath;
    document.getElementById('source-owner').textContent = host + '/' + repoOwner;
    document.getElementById('source-host-mark').innerHTML = isGitLab ? GITLAB_MARK : GITHUB_MARK;

    var blockedTitleEl = document.getElementById('blocked-source-title');
    if (blockedTitleEl) blockedTitleEl.textContent = name || repoPath;
    var blockedUrlEl = document.getElementById('blocked-source-url');
    if (blockedUrlEl) blockedUrlEl.textContent = url.replace(/^https?:\/\//, '');

    if (appPackage === UNIVERSAL_APP) {
        document.getElementById('app-name').textContent = appName || 'Universal patches';
        document.getElementById('only-app').hidden = true;
        document.getElementById('only-universal').hidden = false;
        document.querySelector('#app-icon .material-symbols-rounded').textContent = 'public';
        document.getElementById('app-section').hidden = false;
    } else if (appPackage) {
        document.getElementById('app-name').textContent = appName || appPackage;
        document.getElementById('app-section').hidden = false;
        showAppIcon(appIcon);
    }

    // Only Play Store icons are shown, as the bundles site links them, so a crafted link cannot put
    // a picture of its own on this page. The generic icon stays when the picture fails to load
    function showAppIcon(iconUrl) {
        var parsed;
        try { parsed = new URL(iconUrl); } catch (e) { return; }
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'play-lh.googleusercontent.com') return;

        var slot = document.getElementById('app-icon');
        var fallback = slot.firstElementChild;
        var img = document.createElement('img');
        img.alt = '';
        img.hidden = true;
        img.addEventListener('load', function () {
            fallback.remove();
            img.hidden = false;
        }, { once: true });
        img.addEventListener('error', function () { img.remove(); }, { once: true });
        img.src = parsed.href;
        slot.appendChild(img);
    }

    // Explicit-package intent launches Manager regardless of App Link status.
    var encodedRepo  = encodeURIComponent(repo);
    var encodedName  = name ? encodeURIComponent(name) : '';
    var encodedApp   = appPackage ? encodeURIComponent(appPackage) : '';
    var encodedAppName = appPackage && appName ? encodeURIComponent(appName) : '';
    var repoParam    = isGitLab ? 'gitlab' : 'github';
    var intentParams = repoParam + '=' + encodedRepo +
        (encodedName ? '&name=' + encodedName : '') +
        (encodedApp ? '&app=' + encodedApp : '') +
        (encodedAppName ? '&appName=' + encodedAppName : '');
    var intentLink   = 'intent://morphe.software/add-source?' + intentParams +
        '#Intent;scheme=https;package=app.morphe.manager;S.browser_fallback_url=' +
        encodeURIComponent('https://morphe.software/') + ';end';

    // Page that linked here, such as a bundle listing. After the source is sent to Manager
    // the success state offers to return there instead of the homepage.
    var referrerUrl = (function () {
        if (!document.referrer) return null;
        try {
            var ref = new URL(document.referrer);
            if (ref.protocol !== 'https:' && ref.protocol !== 'http:') return null;
            if (ref.origin === window.location.origin && ref.pathname === window.location.pathname) return null;
            return ref.href;
        } catch (e) {
            console.warn('Ignoring invalid referrer', document.referrer, e);
            return null;
        }
    })();

    var btnSuccessBack = document.getElementById('btn-success-back');
    if (btnSuccessBack && referrerUrl) {
        btnSuccessBack.href = referrerUrl;
        btnSuccessBack.setAttribute('data-i18n', 'add-source.go-back');
        // Translated with the rest of the page once i18n loads
        btnSuccessBack.textContent = 'Go back';
        btnSuccessBack.addEventListener('click', function (e) {
            // A cross-origin referrer is usually trimmed to its origin, so going back
            // in history returns to the exact page when possible.
            if (window.history.length > 1) {
                e.preventDefault();
                window.history.back();
            }
        });
    }

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
        blocklistPromise.then(function (blocklist) {
            var entry = blocklist.entries.get(providerKey);
            renderState(!!entry, entry ? entry.reason : null, blocklist.updatedAt);
        });
    }

    // Both i18nReady and the fallback timer can call this. Re-rendering is fine,
    // but listeners and analytics events must only be added once.
    var stateRendered = false;

    function renderState(isBlocked, reason, updatedAt) {
        var isFirstRender = !stateRendered;
        stateRendered = true;

        if (window.umami && isBlocked && isFirstRender) {
            umami.track('Add Source Blocked', {
                repo: repo.toLowerCase(),
                reason: reason || 'unspecified'
            });
        }

        if (isBlocked) {
            populateBlockedMeta(reason, updatedAt);
            show('state-blocked');
        } else if (isDevelopment) {
            show('state-development');
            var btnDevBack = document.getElementById('btn-dev-back');
            if (btnDevBack && isFirstRender) {
                btnDevBack.addEventListener('click', function (e) {
                    if (window.history.length > 1) {
                        e.preventDefault();
                        window.history.back();
                    }
                });
            }
        } else if (isAndroid) {
            show('state-android');
            if (isFirstRender) {
                document.getElementById('btn-open').addEventListener('click', function (e) {
                    e.preventDefault();
                    // 'Add Source' counts page views, including people who back out.
                    // This counts people who actually sent the source to Manager.
                    if (window.umami) umami.track('Add Source Open', getTrackingData());
                    show('state-success');
                    window.location.href = intentLink;
                });
            }
        } else {
            show('state-desktop');
            renderDesktopQrCode();
        }
    }

    // Encodes the current page URL so scanning it on a phone opens this same
    // add-source flow there. Renders once, lazily, only for the desktop state.
    var qrRendered = false;
    function renderDesktopQrCode() {
        if (qrRendered || !window.renderQrCode) return;
        var container = document.getElementById('qr-code');
        if (!container) return;
        qrRendered = true;
        window.renderQrCode(container, window.location.href, {
            logo: 'favicon.svg'
        });
    }

    var copyLinkBtn = document.getElementById('btn-copy-link');
    if (copyLinkBtn) {
        var copyIcon = document.getElementById('copy-link-icon');
        var copyText = document.getElementById('copy-link-text');
        var copyResetTimer = null;

        function fallbackCopy(text) {
            var input = document.createElement('textarea');
            input.value = text;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.focus();
            input.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            document.body.removeChild(input);
            return ok;
        }

        function showCopied() {
            if (copyResetTimer) clearTimeout(copyResetTimer);
            copyIcon.textContent = 'check';
            copyText.textContent = window.i18n
                ? window.i18n.t('add-source.desktop-copy-link-done')
                : 'Copied!';
            copyResetTimer = setTimeout(function () {
                copyIcon.textContent = 'content_copy';
                copyText.textContent = window.i18n
                    ? window.i18n.t('add-source.desktop-copy-link')
                    : 'Copy link';
            }, 1800);
        }

        copyLinkBtn.addEventListener('click', function () {
            var link = window.location.href;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(link).then(showCopied, function () {
                    if (fallbackCopy(link)) showCopied();
                });
            } else if (fallbackCopy(link)) {
                showCopied();
            }
        });
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
