/**
 * FAQ Page — accordion toggle, section filtering, and search
 */
(function () {
    'use strict';

    const searchInput = document.getElementById('faq-search');
    const clearButton = document.getElementById('faq-search-clear');
    const noResults = document.getElementById('faq-no-results');
    const faqSections = document.querySelectorAll('.faq-section');
    const faqItems = document.querySelectorAll('.faq-item');

    /**
     * Answers are collapsed with max-height, which needs a real value to
     * animate to. Measure the content instead of relying on a fixed cap,
     * otherwise long answers get cut off.
     */
    function measureAnswer(item) {
        const answer = item.querySelector('.faq-answer');
        if (!answer) return;
        answer.style.setProperty('--faq-answer-height', answer.scrollHeight + 'px');
    }

    function remeasureOpenAnswers() {
        document.querySelectorAll('.faq-item.active').forEach(measureAnswer);
    }

    // --- Accordion expand/collapse ---
    faqItems.forEach(item => {
        const button = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if (!button || !answer) return;

        // Accessibility setup
        button.setAttribute('aria-expanded', 'false');
        if (item.id && !answer.id) {
            answer.id = item.id + '-answer';
            button.setAttribute('aria-controls', answer.id);
        }

        button.addEventListener('click', () => {
            const isExpanding = !item.classList.contains('active');

            // Collapse other active items
            document.querySelectorAll('.faq-item.active').forEach(openItem => {
                if (openItem !== item) {
                    openItem.classList.remove('active');
                    const openBtn = openItem.querySelector('.faq-question');
                    if (openBtn) openBtn.setAttribute('aria-expanded', 'false');
                }
            });

            item.classList.toggle('active');
            button.setAttribute('aria-expanded', isExpanding ? 'true' : 'false');

            if (isExpanding) measureAnswer(item);

            // Update URL hash without jumping
            if (isExpanding && item.id) {
                history.replaceState(null, null, '#' + item.id);
            } else if (!isExpanding && window.location.hash === '#' + item.id) {
                // Remove hash if the item is closed
                history.replaceState(null, null, window.location.pathname + window.location.search);
            }
        });
    });

    let currentSearchQuery = '';

    // --- Search Logic ---
    function applyFilters() {
        let totalVisible = 0;
        const query = currentSearchQuery.toLowerCase().trim();

        faqSections.forEach(section => {
            let visibleInSection = 0;

            section.querySelectorAll('.faq-item').forEach(item => {
                const title = item.querySelector('.faq-text')?.textContent || '';
                const body = item.querySelector('.faq-answer')?.textContent || '';
                const searchableText = (title + ' ' + body).toLowerCase();

                const matches = query === '' || searchableText.includes(query);

                if (matches) {
                    item.style.display = '';
                    visibleInSection++;
                    totalVisible++;
                } else {
                    item.style.display = 'none';
                    item.classList.remove('active');
                    const btn = item.querySelector('.faq-question');
                    if (btn) btn.setAttribute('aria-expanded', 'false');
                }
            });

            section.style.display = visibleInSection > 0 ? '' : 'none';
        });

        // Toggle "No results" message
        if (noResults) {
            noResults.classList.toggle('hidden', totalVisible > 0 || query === '');
        }

        // Toggle clear button
        if (clearButton) {
            clearButton.classList.toggle('hidden', query === '');
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value;
            applyFilters();
        });
    }

    if (clearButton) {
        clearButton.addEventListener('click', () => {
            if (searchInput) {
                searchInput.value = '';
                currentSearchQuery = '';
                searchInput.focus();
                applyFilters();
            }
        });
    }

    // --- Deep-link: auto-expand if URL hash matches an FAQ anchor ---
    function expandFromHash() {
        const hash = window.location.hash;
        if (!hash) return;

        const target = document.querySelector(hash);
        if (target && target.classList.contains('faq-item')) {
            // Ensure it's visible if there's a search active
            target.style.display = '';
            const section = target.closest('.faq-section');
            if (section) section.style.display = '';

            target.classList.add('active');
            measureAnswer(target);
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

    // Content can change height after it is measured: a nested <details> is
    // opened, the viewport is resized, or a webfont finishes loading.
    document.addEventListener('toggle', (e) => {
        const item = e.target.closest && e.target.closest('.faq-item.active');
        if (item) measureAnswer(item);
    }, true);

    let resizeFrame = null;
    window.addEventListener('resize', () => {
        if (resizeFrame) cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(remeasureOpenAnswers);
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(remeasureOpenAnswers);
    }

    // Run initial hash check
    expandFromHash();
    window.addEventListener('hashchange', expandFromHash);
})();
