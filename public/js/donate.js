// Open Collective backers & sponsors loader
(function () {
    'use strict';

    var OC_SLUG = 'morpheapp';
    var OC_GQL  = 'https://api.opencollective.com/graphql/v2';

    var GQL_QUERY = JSON.stringify({
        query: [
            '{ collective(slug: "' + OC_SLUG + '") {',
            '  members(role: BACKER, limit: 20, orderBy: { field: CREATED_AT, direction: DESC }) {',
            '    totalCount nodes { tier { name } account { name imageUrl(height: 128) slug website } }',
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
        return name.indexOf('mega') !== -1 || name.indexOf('sponsor') !== -1;
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

        var backers = nodes.filter(function (n) { return !isSponsor(n); });

        if (backers.length === 0) {
            showEmpty('donate-state-loading', 'donate-state-empty');
            return;
        }

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
            var members = data.data && data.data.collective && data.data.collective.members;
            if (members && members.nodes) {
                buildSponsors(members.nodes);
                buildBackers(members.nodes, members.totalCount);
            } else {
                onFail();
            }
        })
        .catch(onFail);
})();
