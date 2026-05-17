// Open Collective backers & sponsors loader
(function () {
    'use strict';

    var OC_SLUG = 'morpheapp';
    var OC_GQL  = 'https://api.opencollective.com/graphql/v2';

    var GQL_QUERY = JSON.stringify({
        query: [
            '{ collective(slug: "' + OC_SLUG + '") {',
            '  sponsors: members(role: BACKER, limit: 200, orderBy: { field: CREATED_AT, direction: DESC }) {',
            '    nodes { tier { name } account { name imageUrl(height: 128) slug website } }',
            '  }',
            '  backers: members(role: BACKER, limit: 200, orderBy: { field: CREATED_AT, direction: DESC }) {',
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

    function isSponsor(node) {
        if (!node.tier || !node.tier.name) return false;
        var name = node.tier.name.toLowerCase();
        return name.indexOf('mega') !== -1 ||
               name.indexOf('sponsor') !== -1 ||
               name.indexOf('supporter') !== -1;
    }

    function buildSponsors(nodes) {
        var container = document.getElementById('donate-sponsors-avatars');
        var stateLoad = document.getElementById('donate-sponsors-loading');
        if (!container) return;
        if (stateLoad) stateLoad.hidden = true;

        var sponsors = nodes.filter(isSponsor);

        if (sponsors.length === 0) {
            showEmpty('donate-sponsors-loading', 'donate-sponsors-empty');
            return;
        }

        sponsors.forEach(function (node) {
            var account = node.account;
            var a = document.createElement('a');
            a.href      = account.website || ('https://opencollective.com/' + account.slug);
            a.target    = '_blank';
            a.rel       = 'noopener noreferrer';
            a.className = 'donate-sponsor-avatar';
            a.title     = account.name || 'Sponsor';

            if (account.imageUrl) {
                var img     = document.createElement('img');
                img.src     = account.imageUrl;
                img.alt     = account.name || 'Sponsor';
                img.loading = 'lazy';
                img.onerror = function () {
                    this.remove();
                    a.textContent = (account.name || '?')[0].toUpperCase();
                };
                a.appendChild(img);
            } else {
                a.textContent = (account.name || '?')[0].toUpperCase();
            }

            container.appendChild(a);
        });
    }

    function buildBackers(nodes, totalCount) {
        var container = document.getElementById('donate-avatars');
        var stateLoad = document.getElementById('donate-state-loading');
        if (!container) return;
        if (stateLoad) stateLoad.hidden = true;

        var filteredNodes = nodes.filter(function (n) { return !isSponsor(n); });

        if (filteredNodes.length === 0) {
            showEmpty('donate-state-loading', 'donate-state-empty');
            return;
        }

        var recurring = filteredNodes.filter(function (n) { return !!n.tier; });
        var oneTime   = filteredNodes.filter(function (n) { return !n.tier; });

        recurring.sort(function (a, b) {
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

        // oneTime is already sorted by CREATED_AT DESC from the API
        var backers = recurring.concat(oneTime);

        backers.forEach(function (node) {
            var account = node.account;
            var a = document.createElement('a');
            a.href      = 'https://opencollective.com/' + account.slug;
            a.target    = '_blank';
            a.rel       = 'noopener noreferrer';
            a.className = 'donate-avatar';
            a.title     = account.name || 'Backer';

            if (account.imageUrl) {
                var img     = document.createElement('img');
                img.src     = account.imageUrl;
                img.alt     = account.name || 'Backer';
                img.loading = 'lazy';
                img.onerror = function () {
                    this.remove();
                    a.textContent = (account.name || '?')[0].toUpperCase();
                };
                a.appendChild(img);
            } else {
                a.textContent = (account.name || '?')[0].toUpperCase();
            }

            container.appendChild(a);
        });

        var sponsorCount = nodes.filter(isSponsor).length;
        var remaining = Math.max(0, totalCount - backers.length - sponsorCount);
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
        showEmpty('donate-sponsors-loading', 'donate-sponsors-empty');
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
            if (collective) {
                var sponsorNodes = (collective.sponsors && collective.sponsors.nodes) || [];
                var backerNodes = (collective.backers && collective.backers.nodes) || [];
                var totalCount = (collective.backers && collective.backers.totalCount) || 0;

                buildSponsors(sponsorNodes);
                buildBackers(backerNodes, totalCount);
            } else {
                onFail();
            }
        })
        .catch(onFail);
})();
