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
        if (!node.tier || !node.tier.name) return false;
        var name = node.tier.name.toLowerCase();
        return name.indexOf('mega') !== -1 ||
               name.indexOf('sponsor') !== -1;
    }

    function buildBackers(nodes, totalCount) {
        var container = document.getElementById('donate-avatars');
        var stateLoad = document.getElementById('donate-state-loading');
        if (!container) return;
        if (stateLoad) stateLoad.hidden = true;

        if (!nodes || nodes.length === 0) {
            showEmpty('donate-state-loading', 'donate-state-empty');
            return;
        }

        // Separate Mega Supporters and others
        var megaSupporters = nodes.filter(isMegaSponsor);
        var otherBackers = nodes.filter(function(n) { return !isMegaSponsor(n); });

        // Sort Mega Supporters by total donations (most ever)
        megaSupporters.sort(function (a, b) {
            var valA = (a.totalDonations && a.totalDonations.value) || 0;
            var valB = (b.totalDonations && b.totalDonations.value) || 0;
            return valB - valA;
        });

        // Sort other backers (recurring then one-time, then by value/date)
        var recurring = otherBackers.filter(function (n) { return !!n.tier; });
        var oneTime   = otherBackers.filter(function (n) { return !n.tier; });

        var sortByValueAndDate = function (a, b, secondaryNewestFirst) {
            var valA = (a.totalDonations && a.totalDonations.value) || 0;
            var valB = (b.totalDonations && b.totalDonations.value) || 0;
            if (valB !== valA) return valB - valA;
            var dateA = new Date(a.createdAt || 0);
            var dateB = new Date(b.createdAt || 0);
            return secondaryNewestFirst ? (dateB - dateA) : (dateA - dateB);
        };

        recurring.sort(function(a, b) { return sortByValueAndDate(a, b, false); });
        oneTime.sort(function(a, b) { return sortByValueAndDate(a, b, true); });

        var allBackers = megaSupporters.concat(recurring, oneTime);

        allBackers.forEach(function (node) {
            var account = node.account;
            var isMega = isMegaSponsor(node);

            var a = document.createElement('a');
            a.href      = isMega && account.website ? account.website : ('https://opencollective.com/' + account.slug);
            a.target    = '_blank';
            a.rel       = 'noopener noreferrer';
            a.className = isMega ? 'donate-avatar donate-avatar-mega' : 'donate-avatar';
            a.title     = (isMega ? 'Mega Supporter: ' : 'Backer: ') + (account.name || 'Anonymous');

            if (isMega) {
                var trophy = document.createElement('span');
                trophy.className = 'material-symbols-rounded mega-trophy';
                trophy.textContent = 'emoji_events';
                a.appendChild(trophy);
            }

            if (account.imageUrl) {
                var img     = document.createElement('img');
                img.src     = account.imageUrl;
                img.alt     = account.name || 'Backer';
                img.loading = 'lazy';
                img.onerror = function () {
                    this.remove();
                    var initials = document.createElement('span');
                    initials.textContent = (account.name || '?')[0].toUpperCase();
                    a.appendChild(initials);
                };
                a.appendChild(img);
            } else {
                var initials = document.createElement('span');
                initials.textContent = (account.name || '?')[0].toUpperCase();
                a.appendChild(initials);
            }

            container.appendChild(a);
        });

        var remaining = Math.max(0, totalCount - allBackers.length);
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
