// Testimonials Module
// Loads testimonials from i18n translations and handles carousel

(function() {
    'use strict';

    // Testimonial card template
    function createTestimonialCard(testimonial) {
        const avatar = testimonial.author ? testimonial.author.charAt(0).toUpperCase() : '?';

        return `
            <div class="testimonial-card">
                <div class="testimonial-content">
                    <p class="testimonial-text">${testimonial.text}</p>
                </div>
                <div class="testimonial-author">
                    <div class="author-avatar">${avatar}</div>
                    <div class="author-info">
                        <div class="author-name">${testimonial.author}</div>
                        <div class="author-role">${testimonial.role}</div>
                    </div>
                </div>
                <div class="testimonial-rating">
                    ${'<span class="star">★</span>'.repeat(5)}
                </div>
            </div>
        `;
    }

    // Extract testimonials from i18n
    function loadTestimonials() {
        if (!window.i18n?.translations?.testimonials) {
            return [];
        }

        const testimonials = [];
        const section = window.i18n.translations.testimonials;
        let index = 1;

        // Load all quote_N entries
        while (section[`quote_${index}`]) {
            const quote = section[`quote_${index}`];
            testimonials.push({
                text: quote.text || '',
                author: quote.author || 'Unknown',
                role: quote.role || ''
            });
            index++;
        }

        // Shuffle for variety
        return shuffleArray(testimonials);
    }

    // Fisher-Yates shuffle
    function shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    // Render testimonials into DOM
    function renderTestimonials(testimonials) {
        const grid = document.getElementById('testimonials-grid');
        if (!grid) return;

        if (testimonials.length === 0) {
            grid.innerHTML = '<p>No testimonials available</p>';
            return;
        }

        grid.innerHTML = testimonials.map(createTestimonialCard).join('');
    }

    // Initialize carousel
    function initializeCarousel() {
        const carousel = document.querySelector('.testimonials-carousel');
        if (!carousel) return;

        const grid = carousel.querySelector('.testimonials-grid');
        const prevBtn = carousel.querySelector('.carousel-button.prev');
        const nextBtn = carousel.querySelector('.carousel-button.next');
        const cards = grid.querySelectorAll('.testimonial-card');

        if (cards.length === 0) return;

        let currentIndex = 0;
        const isMobile = window.innerWidth <= 768;
        const cardsToShow = isMobile ? 1 : 3;
        const maxIndex = Math.max(0, cards.length - cardsToShow);

        // Touch/swipe tracking
        let touchStartX = 0;
        let isDragging = false;

        function updateCarousel() {
            const cardWidth = cards[0].offsetWidth;
            const gap = parseInt(getComputedStyle(grid).gap) || 16;
            const offset = currentIndex * (cardWidth + gap);
            grid.style.transform = `translateX(-${offset}px)`;
            grid.style.transition = 'transform 0.3s ease-out';
        }

        function handleSwipe(deltaX) {
            const threshold = 50;
            if (Math.abs(deltaX) < threshold) {
                updateCarousel();
                return;
            }

            if (deltaX > 0) {
                currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
            } else {
                currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
            }
            updateCarousel();
        }

        // Touch events
        grid.addEventListener('touchstart', (e) => {
            isDragging = true;
            touchStartX = e.touches[0].screenX;
            grid.style.transition = 'none';
        });

        grid.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = touchStartX - e.changedTouches[0].screenX;
            handleSwipe(deltaX);
        });

        // Mouse events
        grid.addEventListener('mousedown', (e) => {
            isDragging = true;
            touchStartX = e.screenX;
            grid.style.transition = 'none';
            grid.style.cursor = 'grabbing';
        });

        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = touchStartX - e.screenX;
            handleSwipe(deltaX);
            grid.style.cursor = 'grab';
        });

        grid.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                updateCarousel();
                grid.style.cursor = 'grab';
            }
        });

        // Button controls
        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
            updateCarousel();
        });

        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
            updateCarousel();
        });

        // Responsive resize
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const newIsMobile = window.innerWidth <= 768;
                if (newIsMobile !== isMobile) {
                    location.reload();
                }
                updateCarousel();
            }, 250);
        });

        updateCarousel();
    }

    // Initialize testimonials with event-based approach
    function init() {
        window.addEventListener('i18nReady', function(event) {
            console.log('i18n ready event received:', event.detail);
            const testimonials = loadTestimonials();
            renderTestimonials(testimonials);

            // Initialize carousel after render
            setTimeout(() => {
                initializeCarousel();
            }, 100);
        });

        if (window.i18n && window.i18n.translations && window.i18n.translations.testimonials) {
            console.log('i18n already ready, loading immediately');
            const testimonials = loadTestimonials();
            renderTestimonials(testimonials);

            setTimeout(() => {
                initializeCarousel();
            }, 100);
        }
    }

    // Reload on language change
    window.reloadTestimonials = function() {
        const testimonials = loadTestimonials();
        renderTestimonials(testimonials);
    };

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
