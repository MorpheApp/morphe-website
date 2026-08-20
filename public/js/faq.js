/**
 * FAQ Page — accordion toggle, section filtering, and search
 */
(function () {
    'use strict';

    // --- Accordion expand/collapse ---
    document.querySelectorAll('.faq-question').forEach(button => {
        button.setAttribute('aria-expanded', 'false');

        button.addEventListener('click', () => {
            const item = button.closest('.faq-item');
            if (!item) return;

            document.querySelectorAll('.faq-item.active').forEach(openItem => {
                if (openItem !== item) {
                    openItem.classList.remove('active');
                    const openBtn = openItem.querySelector('.faq-question');
                    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
                }
            });

            item.classList.toggle('active');
            button.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');
        });
    });

    let currentSectionFilter = 'all';
    let currentSearchQuery = '';

    // --- Deep-link: auto-expand if URL hash matches an FAQ anchor ---
    function expandFromHash() {
        const hash = window.location.hash;
        if (!hash) return;

        const target = document.querySelector(hash);
        if (target && target.classList.contains('faq-item')) {
            // Show the correct section filter
            const section = target.getAttribute('data-section');
            if (section) {
                currentSectionFilter = section;
                applyFilters();
                // Update active filter button
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-filter') === section);
                });
            }

            target.classList.add('active');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // --- Combined Section Filter and Search ---
    function applyFilters() {
        document.querySelectorAll('.faq-section').forEach(section => {
            const sectionType = section.getAttribute('data-section');
            let visibleItemsCount = 0;

            const matchesSection = currentSectionFilter === 'all' || sectionType === currentSectionFilter;

            section.querySelectorAll('.faq-item').forEach(item => {
                const questionText = item.querySelector('.faq-text').textContent.toLowerCase();
                const matchesSearch = currentSearchQuery === '' || questionText.includes(currentSearchQuery);

                if (matchesSection && matchesSearch) {
                    item.style.display = '';
                    visibleItemsCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide the entire section if no items are visible
            if (visibleItemsCount > 0) {
                section.style.display = '';
            } else {
                section.style.display = 'none';
            }
        });
    }

    const searchInput = document.getElementById('faq-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.getAttribute('data-filter');
            if (!filter) return;

            // Update active button
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentSectionFilter = filter;
            applyFilters();
        });
    });

    // Run initial hash check
    expandFromHash();
    window.addEventListener('hashchange', expandFromHash);
})();
