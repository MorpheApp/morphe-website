// Open Collective backers & sponsors loader
(function () {
    'use strict';

    var OC_SLUG = 'morpheapp';
    var OC_GQL  = 'https://api.opencollective.com/graphql/v2';

    var GQL_QUERY = JSON.stringify({
        query: [
            '{ collective(slug: "' + OC_SLUG + '") {',
            '  members(role: BACKER, limit: 500, orderBy: { field: CREATED_AT, direction: DESC }) {',
            '    totalCount nodes { createdAt totalDonations { value } tier { name } account { name imageUrl(height: 128) slug website } }',
            '  }',
            '}}'
        ].join(' ')
    });

    function showEmpty(stateLoadId, stateEmptyId) {
        var stateLoad  = document.getElementById(stateLoadId);
        var stateEmpty = document.getElementById(stateEmptyId);
        if (stateLoad)  stateLoad.hidden  = true;
        if (stateEmpty) stateEmpty.hidden = false;
    }

    function isMegaSponsor(node) {
        if (!node || !node.tier || !node.tier.name) return false;
        var name = node.tier.name.toLowerCase();
        return name.indexOf('mega') !== -1 ||
               name.indexOf('sponsor') !== -1;
    }

    function buildBackers(nodes, totalCount) {
        var container = document.getElementById('donate-avatars');
        var stateLoad = document.getElementById('donate-state-loading');
        if (!container) return;
        if (stateLoad) stateLoad.hidden = true;

        if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
            showEmpty('donate-state-loading', 'donate-state-empty');
            return;
        }

        // Aggregate backers by account slug to avoid duplicates
        var uniqueBackers = {};
        var validNodesCount = 0;

        nodes.forEach(function(node) {
            if (!node || !node.account) return;
            validNodesCount++;

            var account = node.account;
            var slug = account.slug || account.id || ('anon-' + Math.random().toString(36).substring(2, 9));
            if (!uniqueBackers[slug]) {
                uniqueBackers[slug] = {
                    account: account,
                    totalDonations: { value: 0 },
                    createdAt: node.createdAt,
                    isMega: isMegaSponsor(node)
                };
            }
            uniqueBackers[slug].totalDonations.value += (node.totalDonations && node.totalDonations.value) || 0;
            if (isMegaSponsor(node)) {
                uniqueBackers[slug].isMega = true;
            }
            if (node.createdAt && new Date(node.createdAt) < new Date(uniqueBackers[slug].createdAt)) {
                uniqueBackers[slug].createdAt = node.createdAt;
            }
        });

        var aggregatedNodes = Object.keys(uniqueBackers).map(function(slug) {
            return uniqueBackers[slug];
        });

        if (aggregatedNodes.length === 0) {
            showEmpty('donate-state-loading', 'donate-state-empty');
            return;
        }

        // Separate Mega Supporters and others
        var megaSupporters = aggregatedNodes.filter(function(n) { return n.isMega; });
        var otherBackers = aggregatedNodes.filter(function(n) { return !n.isMega; });

        // Sort Mega Supporters by total donations (most ever)
        megaSupporters.sort(function (a, b) {
            var valA = (a.totalDonations && a.totalDonations.value) || 0;
            var valB = (b.totalDonations && b.totalDonations.value) || 0;
            return valB - valA;
        });

        // Sort all other backers strictly by total donations
        otherBackers.sort(function (a, b) {
            var valA = (a.totalDonations && a.totalDonations.value) || 0;
            var valB = (b.totalDonations && b.totalDonations.value) || 0;

            if (valB !== valA) {
                return valB - valA;
            }

            // Secondary sort: Longest donating (Oldest first)
            var dateA = new Date(a.createdAt || 0);
            var dateB = new Date(b.createdAt || 0);
            return dateA - dateB;
        });

        var countEl = document.getElementById('donate-backers-count');
        if (countEl && totalCount) {
            countEl.textContent = totalCount.toLocaleString();
            countEl.hidden = false;
        }

        renderSpotlight(megaSupporters);
        // A few rows are enough; the rest sit behind the "+N" link to Open Collective
        var cap = window.matchMedia('(max-width: 600px)').matches ? 35 : 119;
        var allBackers = otherBackers.slice(0, cap);
        var hiddenBackers = otherBackers.length - allBackers.length;

        allBackers.forEach(function (node) {
            var account = node.account;
            var isMega = node.isMega;
            var displayName = (account.name && account.name.trim()) || 'Backer';

            var a = document.createElement('a');
            a.href      = isMega && account.website ? account.website : ('https://opencollective.com/' + (account.slug || ''));
            a.target    = '_blank';
            a.rel       = 'noopener noreferrer';
            a.className = isMega ? 'donate-avatar donate-avatar-mega' : 'donate-avatar';
            a.title     = (isMega ? 'Mega Supporter: ' : 'Backer: ') + displayName;

            if (account.imageUrl && hasOwnAvatar(account.imageUrl)) {
                var img     = document.createElement('img');
                img.src     = account.imageUrl;
                img.alt     = displayName;
                img.loading = 'lazy';
                img.onerror = function () {
                    this.remove();
                    var initials = document.createElement('span');
                    initials.textContent = displayName[0].toUpperCase();
                    a.appendChild(initials);
                };
                a.appendChild(img);
            } else {
                fillPlaceholder(a, displayName, account.slug);
            }

            container.appendChild(a);
        });

        var remaining = Math.max(0, totalCount - validNodesCount) + hiddenBackers;
        if (remaining > 0) {
            var more = document.createElement('a');
            more.href       = 'https://opencollective.com/morpheapp#section-contributors';
            more.target     = '_blank';
            more.rel        = 'noopener noreferrer';
            more.className  = 'donate-avatar donate-avatar-more';
            more.textContent = '+' + remaining;
            more.title      = remaining + ' more backers';
            container.appendChild(more);
        }
    }

    // Uploaded avatars carry a hash segment (/slug/227f30c/avatar/...); generated ones do not
    function hasOwnAvatar(url) {
        return /\/[0-9a-f]{6,}\/avatar\//i.test(url);
    }

    var ANONYMOUS = /^(guest|incognito|anonymous|backer|)$/i;
    var TINTS = 6;

    // Generated avatars become a soft brand tint with an initial, or a heart for anonymous backers
    function fillPlaceholder(el, name, seed) {
        var clean = (name || '').trim();
        // Seed by account so many "Guest" backers do not all share one colour
        var key = seed || clean;
        var hash = 0;
        for (var i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
        el.classList.add('donate-avatar-placeholder', 'tint-' + (hash % TINTS));
        if (ANONYMOUS.test(clean)) {
            var heart = document.createElement('span');
            heart.className = 'material-symbols-rounded';
            heart.textContent = 'favorite';
            el.appendChild(heart);
        } else {
            var initial = document.createElement('span');
            initial.textContent = clean[0].toUpperCase();
            el.appendChild(initial);
        }
    }

    // Top supporters sit above the grid with their own card
    function renderSpotlight(nodes) {
        var box = document.getElementById('donate-spotlight');
        if (!box || !nodes.length) return;
        var lang = (window.i18n && window.i18n.getCurrentLanguage && window.i18n.getCurrentLanguage()) || document.documentElement.lang || 'en';
        var label = (window.i18n && window.i18n.translate && window.i18n.translate('donate.tier3-name')) || 'Mega Supporter';
        if (label === 'donate.tier3-name') label = 'Mega Supporter';

        nodes.forEach(function (node) {
            var account = node.account;
            var name = (account.name && account.name.trim()) || 'Backer';
            var card = document.createElement('a');
            card.className = 'donate-spotlight-card';
            card.href = account.website || ('https://opencollective.com/' + (account.slug || ''));
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.setAttribute('data-umami-event', 'Mega Supporter Click');

            var ring = document.createElement('span');
            ring.className = 'spotlight-ring';
            var face = document.createElement('span');
            face.className = 'spotlight-face';
            if (account.imageUrl && hasOwnAvatar(account.imageUrl)) {
                var img = document.createElement('img');
                img.src = account.imageUrl;
                img.alt = '';
                img.onerror = function () { this.remove(); face.textContent = name[0].toUpperCase(); };
                face.appendChild(img);
            } else {
                face.textContent = name[0].toUpperCase();
            }
            ring.appendChild(face);

            var info = document.createElement('span');
            info.className = 'spotlight-info';

            var badge = document.createElement('span');
            badge.className = 'spotlight-badge';
            badge.innerHTML = '<span class="material-symbols-rounded">emoji_events</span>';
            var badgeText = document.createElement('span');
            badgeText.setAttribute('data-i18n', 'donate.tier3-name');
            badgeText.textContent = label;
            badge.appendChild(badgeText);

            var title = document.createElement('span');
            title.className = 'spotlight-name';
            title.textContent = name;

            info.appendChild(badge);
            info.appendChild(title);

            if (node.createdAt) {
                var since = document.createElement('span');
                since.className = 'spotlight-since';
                var date = new Date(node.createdAt);
                var text = isNaN(date) ? '' : new Intl.DateTimeFormat(lang, { month: 'short', year: 'numeric' }).format(date);
                if (text) {
                    since.innerHTML = '<span class="material-symbols-rounded">favorite</span>';
                    since.appendChild(document.createTextNode(text));
                    info.appendChild(since);
                }
            }

            var go = document.createElement('span');
            go.className = 'material-symbols-rounded spotlight-go';
            go.textContent = 'open_in_new';

            card.appendChild(ring);
            card.appendChild(info);
            card.appendChild(go);
            box.appendChild(card);
        });
        box.hidden = false;
    }

    function onFail() {
        showEmpty('donate-state-loading', 'donate-state-empty');
    }

    fetch(OC_GQL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: GQL_QUERY
    })
        .then(function (r) {
            if (!r.ok) throw new Error('GraphQL error');
            return r.json();
        })
        .then(function (data) {
            var collective = data.data && data.data.collective;
            if (collective && collective.members) {
                buildBackers(collective.members.nodes, collective.members.totalCount);
            } else {
                onFail();
            }
        })
        .catch(onFail);
})();
