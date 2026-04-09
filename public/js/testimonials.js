// Testimonials Module
// Loads testimonials from i18n translations and handles carousel

(function() {
    'use strict';

    let carouselInstance = null; // Store carousel instance globally

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

        // Reorder testimony by declared indexes
        // Allows easily changing order without localized files
        return reorderByIndexes(
            [2, 9, 3, 16, 4, 18, 5, 10, 6, 11, 7, 13, 12, 15, 17, 14, 19, 8].map( n => n - 1),
            testimonials
        );
    }

    function reorderByIndexes(indexes, values) {
      return indexes
        .filter(i => i >= 0 && i < values.length)
        .map(i => values[i]);
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

    // Destroy existing carousel instance
    function destroyCarousel() {
        if (carouselInstance) {
            // Remove event listeners
            const { grid, prevBtn, nextBtn, mouseUpHandler } = carouselInstance;

            if (grid) {
                grid.removeEventListener('touchstart', carouselInstance.touchStart);
                grid.removeEventListener('touchend', carouselInstance.touchEnd);
                grid.removeEventListener('mousedown', carouselInstance.mouseDown);
            }

            if (prevBtn) {
                prevBtn.removeEventListener('click', carouselInstance.prevClick);
            }

            if (nextBtn) {
                nextBtn.removeEventListener('click', carouselInstance.nextClick);
            }

            if (mouseUpHandler) {
                document.removeEventListener('mouseup', mouseUpHandler);
            }

            window.removeEventListener('resize', carouselInstance.resizeHandler);

            carouselInstance = null;
        }
    }

    // Initialize carousel
    function initializeCarousel() {
        // Destroy existing carousel first
        destroyCarousel();

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
            // Recalculate on each update to ensure correct dimensions
            const cardWidth = cards[0].offsetWidth;
            const gap = parseInt(getComputedStyle(grid).gap) || 16;
            const offset = currentIndex * (cardWidth + gap);
            
            // Handle RTL direction
            const isRTL = document.documentElement.dir === 'rtl';
            const translateX = isRTL ? offset : -offset;
            
            grid.style.transform = `translateX(${translateX}px)`;
            grid.style.transition = 'transform 0.3s ease-out';
        }

        function handleSwipe(deltaX) {
            const threshold = 50;
            if (Math.abs(deltaX) < threshold) {
                updateCarousel();
                return;
            }

            // In RTL, swiping right (negative deltaX) should move to next index
            // and swiping left (positive deltaX) should move to previous index
            const isRTL = document.documentElement.dir === 'rtl';
            const normalizedDeltaX = isRTL ? -deltaX : deltaX;

            if (normalizedDeltaX > 0) {
                currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
            } else {
                currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
            }
            updateCarousel();
        }

        // Touch events
        const touchStart = (e) => {
            isDragging = true;
            touchStartX = e.touches[0].screenX;
            grid.style.transition = 'none';
        };

        const touchEnd = (e) => {
            if (!isDragging) return;
            isDragging = false;
            const deltaX = touchStartX - e.changedTouches[0].screenX;
            handleSwipe(deltaX);
        };

        grid.addEventListener('touchstart', touchStart);
        grid.addEventListener('touchend', touchEnd);

        // Mouse events
        const mouseDown = (e) => {
            isDragging = true;
            touchStartX = e.clientX;
            grid.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const mouseUpHandler = (e) => {
            if (!isDragging) return;

            isDragging = false;
            const deltaX = touchStartX - e.clientX;
            handleSwipe(deltaX);
            grid.style.cursor = 'grab';
        };

        grid.addEventListener('mousedown', mouseDown);
        document.addEventListener('mouseup', mouseUpHandler);

        // Button controls
        const isRTL = document.documentElement.dir === 'rtl';

        // In RTL: swap arrow icons and reorder buttons so ‹ is on the right, › on the left
        if (isRTL) {
            const prevIcon = prevBtn.querySelector('.material-symbols-rounded');
            const nextIcon = nextBtn.querySelector('.material-symbols-rounded');
            if (prevIcon) prevIcon.textContent = 'chevron_right';
            if (nextIcon) nextIcon.textContent = 'chevron_left';
            // Move nextBtn before prevBtn in DOM so › appears on the left
            if (prevBtn.parentNode) {
                prevBtn.parentNode.insertBefore(nextBtn, prevBtn);
            }
        }

        const nextClick = (e) => {
            e.preventDefault();
            // In RTL, the visual "next" button (chevron pointing left) has class .prev
            // so we invert the index direction
            if (isRTL) {
                currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
            } else {
                currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
            }
            updateCarousel();
        };

        const prevClick = (e) => {
            e.preventDefault();
            if (isRTL) {
                currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
            } else {
                currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
            }
            updateCarousel();
        };

        nextBtn.addEventListener('click', nextClick);
        prevBtn.addEventListener('click', prevClick);

        // Responsive resize
        let resizeTimer;
        const resizeHandler = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const newIsMobile = window.innerWidth <= 768;
                if (newIsMobile !== isMobile) {
                    location.reload();
                }
                updateCarousel();
            }, 250);
        };

        window.addEventListener('resize', resizeHandler);

        // Store instance for cleanup
        carouselInstance = {
            grid,
            prevBtn,
            nextBtn,
            touchStart,
            touchEnd,
            mouseDown,
            mouseUpHandler,
            nextClick,
            prevClick,
            resizeHandler
        };

        // Initial update - use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
            updateCarousel();
        });
    }

    // Reload testimonials on language change
    window.reloadTestimonials = function() {
        const testimonials = loadTestimonials();
        renderTestimonials(testimonials);

        // Wait for DOM to update, then reinitialize carousel
        setTimeout(() => {
            initializeCarousel();
        }, 100);
    };

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

        // Also check if i18n is already ready
        if (window.i18n && window.i18n.translations && window.i18n.translations.testimonials) {
            console.log('i18n already ready, loading immediately');
            const testimonials = loadTestimonials();
            renderTestimonials(testimonials);

            setTimeout(() => {
                initializeCarousel();
            }, 100);
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
