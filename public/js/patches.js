/**
 * Patches Page Client-Side JavaScript
 * Handles filtering, search, and expand/collapse functionality
 */
(function() {
    'use strict';

    const STORAGE_KEY_FILTER = 'patches-filter';
    const STORAGE_KEY_SEARCH = 'patches-search';

    class PatchesPage {
        constructor() {
            this.currentFilter = localStorage.getItem(STORAGE_KEY_FILTER) || 'all';
            this.searchQuery = localStorage.getItem(STORAGE_KEY_SEARCH) || '';
            this.init();
        }

        /**
         * Initialize the patches page
         */
        init() {
            this.setupFilters();
            this.setupSearch();
            this.setupToggleButtons();
            this.applyFilters();
        }

        /**
         * Setup filter buttons functionality
         */
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

        /**
         * Setup search input functionality
         */
        setupSearch() {
            const searchInput = document.getElementById('patches-search');
            if (searchInput) {
                searchInput.value = this.searchQuery;

                searchInput.addEventListener('input', (e) => {
                    this.searchQuery = e.target.value.toLowerCase();
                    localStorage.setItem(STORAGE_KEY_SEARCH, this.searchQuery);
                    this.applyFilters();
                });
            }
        }

        /**
         * Setup expand/collapse toggle buttons
         */
        setupToggleButtons() {
            const toggleButtons = document.querySelectorAll('.patch-toggle-btn');
            
            toggleButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    const card = button.closest('.patch-card');
                    card.classList.toggle('expanded');
                    
                    // Update button text
                    const buttonText = button.querySelector('span');
                    if (card.classList.contains('expanded')) {
                        buttonText.textContent = 'Hide Details';
                    } else {
                        buttonText.textContent = 'Show Details';
                    }
                });
            });
        }

        /**
         * Apply filters and search to patch cards
         */
        applyFilters() {
            const cards = document.querySelectorAll('.patch-card');

            cards.forEach(card => {
                const packageName = card.dataset.package;
                const patchName = card.dataset.name.toLowerCase();
                const patchDesc = card.dataset.description.toLowerCase();

                // Check if package matches filter
                const packageMatch = this.currentFilter === 'all' || this.currentFilter === packageName;
                
                // Check if search query matches
                const searchMatch = !this.searchQuery || 
                    patchName.includes(this.searchQuery) || 
                    patchDesc.includes(this.searchQuery);

                // Show/hide card based on filters
                if (packageMatch && searchMatch) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });

            // Check if there are visible cards
            const visibleCards = document.querySelectorAll('.patch-card:not(.hidden)');
            const noResults = document.getElementById('no-results');

            if (visibleCards.length === 0) {
                if (!noResults) {
                    this.showNoResults();
                }
            } else if (noResults) {
                noResults.remove();
            }
        }

        /**
         * Show "no results" message
         */
        showNoResults() {
            const content = document.getElementById('patches-content');
            const noResults = document.createElement('div');
            noResults.id = 'no-results';
            noResults.className = 'changelog-empty';
            noResults.innerHTML = `
                <p>No patches found.</p>
                <p style="margin-top: var(--spacing-sm); font-size: 0.875rem; color: var(--text-tertiary);">
                    Try adjusting your filters or search query.
                </p>
            `;
            content.appendChild(noResults);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new PatchesPage();
        });
    } else {
        new PatchesPage();
    }
})();
