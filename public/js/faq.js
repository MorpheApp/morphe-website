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
            const isActive = item.classList.contains('active');
            button.setAttribute('aria-expanded', isActive ? 'true' : 'false');

            // Update URL hash without jumping
            if (isActive && item.id) {
                history.replaceState(null, null, '#' + item.id);
            } else if (!isActive && window.location.hash === '#' + item.id) {
                // Remove hash if the item is closed
                history.replaceState(null, null, window.location.pathname + window.location.search);
            }
        });
    });

    let currentSearchQuery = '';

    // --- Deep-link: auto-expand if URL hash matches an FAQ anchor ---
    function expandFromHash() {
        const hash = window.location.hash;
        if (!hash) return;

        const target = document.querySelector(hash);
        if (target && target.classList.contains('faq-item')) {
            target.classList.add('active');
            const button = target.querySelector('.faq-question');
            if (button) button.setAttribute('aria-expanded', 'true');

            // Scroll to the item with navbar offset
            setTimeout(() => {
                const nav = document.querySelector('.navbar');
                const navHeight = nav ? nav.offsetHeight : 0;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 30;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }, 100);
        }
    }

    // --- Search Logic ---
    function applyFilters() {
        document.querySelectorAll('.faq-section').forEach(section => {
            let visibleItemsCount = 0;

            section.querySelectorAll('.faq-item').forEach(item => {
                const questionText = item.querySelector('.faq-text').textContent.toLowerCase();
                const matchesSearch = currentSearchQuery === '' || questionText.includes(currentSearchQuery);

                if (matchesSearch) {
                    item.style.display = '';
                    visibleItemsCount++;
                } else {
                    item.style.display = 'none';
                }
            });

            // Hide the entire section if no items are visible
            section.style.display = visibleItemsCount > 0 ? '' : 'none';
        });
    }

    const searchInput = document.getElementById('faq-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            applyFilters();
        });
    }

    // Run initial hash check
    expandFromHash();
    window.addEventListener('hashchange', expandFromHash);
})();
