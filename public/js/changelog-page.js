(function() {
    'use strict';

    const STORAGE_KEY_FILTER = 'changelog-filter';
    const STORAGE_KEY_SHOW_DEV = 'changelog-show-dev';

    class ChangelogPage {
        constructor() {
            this.currentFilter = localStorage.getItem(STORAGE_KEY_FILTER) || 'all';
            this.showDev = localStorage.getItem(STORAGE_KEY_SHOW_DEV) === 'true';
            this.init();
        }

        init() {
            this.setupFilters();
            this.setupToggle();
            this.applyFilters();
        }

        setupFilters() {
            const filterButtons = document.querySelectorAll('.filter-btn');

            filterButtons.forEach(button => {
                // Set active state from saved filter
                if (button.dataset.filter === this.currentFilter) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }

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
            const cards = document.querySelectorAll('.version-card');

            cards.forEach(card => {
                const type = card.dataset.type; // 'manager' or 'patches'
                const isDev = card.dataset.dev === 'true';

                // Type filter
                const typeMatch = this.currentFilter === 'all' || this.currentFilter === type;

                // Dev filter
                const devMatch = this.showDev || !isDev;

                // Show/hide card
                if (typeMatch && devMatch) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });

            // Check if no results
            const visibleCards = document.querySelectorAll('.version-card:not(.hidden)');
            const noResults = document.getElementById('no-results');

            if (visibleCards.length === 0) {
                if (!noResults) {
                    this.showNoResults();
                }
            } else if (noResults) {
                noResults.remove();
            }
        }

        showNoResults() {
            const content = document.getElementById('changelog-content');
            const noResults = document.createElement('div');
            noResults.id = 'no-results';
            noResults.className = 'changelog-empty';
            noResults.innerHTML = `
                <p>No releases found with current filters.</p>
                <p style="margin-top: var(--spacing-sm); font-size: 0.875rem; color: var(--text-tertiary);">
                    Try adjusting your filters or enable dev releases.
                </p>
            `;
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
