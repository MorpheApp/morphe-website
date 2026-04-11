(function() {
    'use strict';

    const STORAGE_KEY_FILTER   = 'changelog-filter';
    const STORAGE_KEY_SHOW_DEV = 'changelog-show-dev';

    const PAGE_SIZE   = 8;  // cards revealed per batch
    const SENTINEL_ID = 'changelog-scroll-sentinel';

    /**
     * Format an ISO date string (YYYY-MM-DD) according to the given BCP 47 locale.
     * Falls back to the raw string if Intl is unavailable or the date is invalid.
     */
    function formatDate(isoDate, locale) {
        try {
            // Parse as UTC noon to avoid off-by-one from timezone shifts
            const date = new Date(isoDate + 'T12:00:00Z');
            if (isNaN(date.getTime())) return isoDate;

            return new Intl.DateTimeFormat(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).format(date);
        } catch (_) {
            return isoDate;
        }
    }

    /**
     * Re-format all <time data-date="…"> elements using the current i18n locale.
     */
    function applyLocaleDates() {
        const lang = (window.i18n && window.i18n.getCurrentLanguage())
            || document.documentElement.lang
            || navigator.language
            || 'en';

        document.querySelectorAll('time[data-date]').forEach(el => {
            el.textContent = formatDate(el.getAttribute('data-date'), lang);
        });
    }

    class ChangelogPage {
        constructor() {
            this.currentFilter = localStorage.getItem(STORAGE_KEY_FILTER) || 'all';
            this.showDev       = localStorage.getItem(STORAGE_KEY_SHOW_DEV) === 'true';
            this.visibleCount  = 0;   // how many matching cards are currently revealed
            this.matchingCards = [];  // ordered list of cards that pass current filters
            this.observer      = null;
            this.init();
        }

        init() {
            this.setupFilters();
            this.setupToggle();
            this.setupI18nIntegration();
            this.applyFilters();
        }

        /**
         * Hook into i18n events so dates and badges update when the language changes.
         */
        setupI18nIntegration() {
            // i18n may already be ready (script order) or fire later
            window.addEventListener('i18nReady', () => applyLocaleDates(), { once: true });
            window.addEventListener('i18nLanguageChanged', () => {
                applyLocaleDates();
                // Re-apply badge translations (i18n.applyTranslations handles data-i18n elements)
                if (window.i18n && typeof window.i18n.applyTranslations === 'function') {
                    window.i18n.applyTranslations();
                }
            });
            // If i18n already fired before this script ran, format immediately
            if (window.i18n && window.i18n.getCurrentLanguage()) {
                applyLocaleDates();
            }
        }

        setupFilters() {
            const filterButtons = document.querySelectorAll('.filter-btn');

            filterButtons.forEach(button => {
                // Set active state from saved filter
                button.classList.toggle('active', button.dataset.filter === this.currentFilter);

                button.addEventListener('click', () => {
                    this.currentFilter = button.dataset.filter;
                    localStorage.setItem(STORAGE_KEY_FILTER, this.currentFilter);

                    // Update active states
                    filterButtons.forEach(b => b.classList.remove('active'));
                    button.classList.add('active');

                    this.applyFilters();
                });
            });
        }

        setupToggle() {
            const toggle = document.getElementById('show-dev');
            if (toggle) {
                toggle.checked = this.showDev;

                toggle.addEventListener('change', () => {
                    this.showDev = toggle.checked;
                    localStorage.setItem(STORAGE_KEY_SHOW_DEV, this.showDev);
                    this.applyFilters();
                });
            }
        }

        applyFilters() {
            const allCards = Array.from(document.querySelectorAll('.version-card'));

            // Partition cards into matching / non-matching
            this.matchingCards = [];
            allCards.forEach(card => {
                const type  = card.dataset.type; // 'manager' or 'patches'
                const isDev = card.dataset.dev === 'true';

                // Type filter
                const typeMatch = this.currentFilter === 'all' || this.currentFilter === type;

                // Dev filter
                const devMatch = this.showDev || !isDev;

                // Show/hide card
                if (typeMatch && devMatch) {
                    this.matchingCards.push(card);
                    card.classList.add('lazy-hidden'); // hide but keep in DOM for observer
                    card.classList.remove('hidden', 'card-reveal');
                } else {
                    card.classList.add('hidden');
                    card.classList.remove('lazy-hidden', 'card-reveal');
                }
            });

            // Reset pagination
            this.visibleCount = 0;
            this.removeSentinel();
            this.disconnectObserver();

            // Check if no results
            const noResults = document.getElementById('no-results');
            if (this.matchingCards.length === 0) {
                if (!noResults) this.showNoResults();
                return;
            }
            if (noResults) noResults.remove();

            // Reveal first batch immediately, then set up observer for the rest
            this.revealNextBatch();
            this.setupObserver();
        }

        /** Make the next PAGE_SIZE matching cards visible */
        revealNextBatch() {
            const end = Math.min(this.visibleCount + PAGE_SIZE, this.matchingCards.length);
            for (let i = this.visibleCount; i < end; i++) {
                const card = this.matchingCards[i];
                card.classList.remove('lazy-hidden');
                // Stagger the fade-in animation within each batch
                card.style.setProperty('--card-delay', `${(i - this.visibleCount) * 40}ms`);
                card.classList.add('card-reveal');
            }
            this.visibleCount = end;

            // Move sentinel after the last revealed card, or remove if all shown
            if (this.visibleCount < this.matchingCards.length) {
                this.placeSentinel();
            } else {
                this.removeSentinel();
                this.disconnectObserver();
            }
        }

        setupObserver() {
            if (!('IntersectionObserver' in window)) {
                // Fallback: reveal all at once for browsers without IntersectionObserver
                this.revealAll();
                return;
            }
            this.observer = new IntersectionObserver(entries => {
                if (entries[0].isIntersecting) this.revealNextBatch();
            }, { rootMargin: '200px' });

            const sentinel = this.getSentinel();
            if (sentinel) this.observer.observe(sentinel);
        }

        disconnectObserver() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
        }

        getSentinel() {
            return document.getElementById(SENTINEL_ID);
        }

        placeSentinel() {
            let sentinel = this.getSentinel();
            if (!sentinel) {
                sentinel = document.createElement('div');
                sentinel.id = SENTINEL_ID;
            }
            // Insert after the last visible card
            const lastVisible = this.matchingCards[this.visibleCount - 1];
            lastVisible.after(sentinel);

            // Re-observe after moving
            if (this.observer) {
                this.observer.disconnect();
                this.observer.observe(sentinel);
            }
        }

        removeSentinel() {
            const s = this.getSentinel();
            if (s) s.remove();
        }

        revealAll() {
            this.matchingCards.forEach(c => c.classList.remove('lazy-hidden'));
            this.visibleCount = this.matchingCards.length;
            this.removeSentinel();
        }

        showNoResults() {
            const content   = document.getElementById('changelog-content');
            const noResults = document.createElement('div');
            noResults.id        = 'no-results';
            noResults.className = 'changelog-empty';
            noResults.innerHTML =
                '<p data-i18n="changelog.no-results">No releases found with current filters.</p>' +
                '<p style="margin-top: var(--spacing-sm); font-size: 0.875rem; color: var(--text-tertiary);" ' +
                'data-i18n="changelog.no-results-hint">Try adjusting your filters or enable dev releases.</p>';
            content.appendChild(noResults);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new ChangelogPage();
        });
    } else {
        new ChangelogPage();
    }
})();
