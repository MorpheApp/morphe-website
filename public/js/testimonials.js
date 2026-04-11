// Testimonials Module
// Loads testimonials from i18n translations and handles carousel.
//
// Architecture overview:
//   - Cards are rendered from i18n translations into #testimonials-grid
//   - The carousel uses CSS transform: translateX() for animation — NOT
//     scrollLeft/scroll-snap. This avoids the Chrome Android race condition
//     where the browser's snap animation fights programmatic scrollLeft writes,
//     causing cards to stutter or land in wrong positions.
//   - Infinite looping is achieved by cloning all cards once before and once
//     after the real list. After each animated step we silently teleport back
//     to the real card if we've landed on a clone.
//   - Input is handled via Pointer Events (unified mouse + touch). Scroll
//     direction intent (horizontal vs vertical) is decided after INTENT_THRESHOLD
//     pixels of movement so vertical page scroll is never hijacked.

(function() {
    'use strict';

    // Holds references to the active carousel's DOM nodes and event handlers
    // so they can be fully cleaned up before re-initialising (e.g. on language change).
    let carouselInstance = null;

    // Card template
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

        // Collect all quote_N entries in declaration order
        while (section[`quote_${index}`]) {
            const quote = section[`quote_${index}`];
            testimonials.push({
                text: quote.text || '',
                author: quote.author || 'Unknown',
                role: quote.role || ''
            });
            index++;
        }

        // Apply a fixed display order that is independent of the translation files.
        // This lets us reorder quotes without touching every locale.
        return reorderByIndexes(
            [2, 9, 3, 16, 4, 18, 5, 10, 6, 11, 7, 13, 12, 15, 17, 14, 19, 8].map(n => n - 1),
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
        if (!carouselInstance) return;

        const { track, prevBtn, nextBtn, resizeHandler, nextClick, prevClick,
                pointerDown, pointerMove, pointerUp } = carouselInstance;

        if (track) {
            // Remove DOM clones added during init
            track.querySelectorAll('.testimonial-card-clone').forEach(el => el.remove());
            // Reset all inline styles set by the carousel
            track.style.cssText = '';
            track.removeEventListener('pointerdown', pointerDown);
            track.removeEventListener('pointermove', pointerMove);
            track.removeEventListener('pointerup', pointerUp);
            track.removeEventListener('pointercancel', pointerUp);
        }

        if (prevBtn && prevClick) prevBtn.removeEventListener('click', prevClick);
        if (nextBtn && nextClick) nextBtn.removeEventListener('click', nextClick);
        if (resizeHandler) window.removeEventListener('resize', resizeHandler);

        carouselInstance = null;
    }

    // Initialize carousel
    function initializeCarousel() {
        // Destroy existing carousel first
        destroyCarousel();

        const carousel = document.querySelector('.testimonials-carousel');
        if (!carousel) return;

        const track = carousel.querySelector('.testimonials-grid');
        const prevBtn = carousel.querySelector('.carousel-button.prev');
        const nextBtn = carousel.querySelector('.carousel-button.next');
        if (!track || !prevBtn || !nextBtn) return;

        // Guard against stale clones left by a previous init that was interrupted
        track.querySelectorAll('.testimonial-card-clone').forEach(el => el.remove());

        const originalCards = Array.from(track.querySelectorAll('.testimonial-card'));
        if (originalCards.length === 0) return;

        const isRTL = document.documentElement.dir === 'rtl';
        const total = originalCards.length;

        // Called on every step and resize because card width is viewport-relative.
        function measure() {
            const isMobile = window.innerWidth <= 768;
            const carouselPaddingL = parseFloat(getComputedStyle(carousel).paddingLeft) || 0;
            const carouselPaddingR = parseFloat(getComputedStyle(carousel).paddingRight) || 0;
            // Available width after carousel's own padding (peek gaps)
            const carouselW = carousel.clientWidth - carouselPaddingL - carouselPaddingR;
            const gap = parseFloat(getComputedStyle(track).gap) || 32;
            // Mobile: one full-width card; Desktop: three cards with two gaps
            const cardW = isMobile
                ? carouselW
                : (carouselW - gap * 2) / 3;
            return { cardW, gap };
        }

        // Prepend clones of the END of the list (in reverse) so that scrolling
        // left from card[0] immediately shows card[total-1], card[total-2], etc.
        for (let i = originalCards.length - 1; i >= 0; i--) {
            const cl = originalCards[i].cloneNode(true);
            cl.classList.add('testimonial-card-clone');
            track.insertBefore(cl, track.firstChild);
        }
        // Append clones of the START of the list so that scrolling right from
        // card[total-1] immediately shows card[0], card[1], etc.
        originalCards.forEach(c => {
            const cl = c.cloneNode(true);
            cl.classList.add('testimonial-card-clone');
            track.appendChild(cl);
        });

        // allCards[0 .. total-1]          → before-clones (mirrors end of real list)
        // allCards[total .. total*2-1]    → real cards
        // allCards[total*2 .. total*3-1]  → after-clones  (mirrors start of real list)
        const allCards = Array.from(track.children);
        let currentIndex = total; // always start on the first real card

        // Override any CSS that assumed a scroll container; we drive layout
        // entirely through transform so the browser has no scroll position to fight.
        track.style.display = 'flex';
        track.style.flexWrap = 'nowrap';
        track.style.overflowX = 'visible';
        track.style.willChange = 'transform';
        track.style.userSelect = 'none';
        track.style.cursor = 'grab';
        track.style.paddingTop = '8px';
        track.style.paddingBottom = '16px';
        track.style.transition = 'none';

        function applyCardSizes() {
            const { cardW, gap } = measure();
            allCards.forEach(card => {
                card.style.flex = `0 0 ${cardW}px`;
                card.style.minWidth = `${cardW}px`;
                card.style.maxWidth = `${cardW}px`;
            });
            track.style.gap = `${gap}px`;
        }

        applyCardSizes();

        // Returns the translateX magnitude (always positive) for a given index.
        function getOffset(index) {
            const { cardW, gap } = measure();
            return index * (cardW + gap);
        }

        // Applies the offset as a CSS transform, optionally animated.
        // RTL: positive translateX moves track right, so we flip the sign.
        function setPosition(offset, animate) {
            track.style.transition = animate
                ? 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                : 'none';
            track.style.transform = `translateX(${isRTL ? offset : -offset}px)`;
        }

        // After an animated step lands on a clone, silently jump to the
        // corresponding real card so the buffer is always available in both directions.
        function teleportIfNeeded() {
            if (currentIndex < total) {
                // Landed on a before-clone → jump to the matching real card at end
                currentIndex += total;
                setPosition(getOffset(currentIndex), false);
            } else if (currentIndex >= total * 2) {
                // Landed on an after-clone → jump to the matching real card at start
                currentIndex -= total;
                setPosition(getOffset(currentIndex), false);
            }
            isStepping = false;
        }

        // Initial silent placement at the first real card
        setPosition(getOffset(currentIndex), false);

        // isStepping prevents overlapping steps while a transition is in flight
        let isStepping = false;

        function step(direction) {
            if (isStepping) return;
            isStepping = true;
            currentIndex += direction;
            setPosition(getOffset(currentIndex), true);
            // Wait for the CSS transition (350ms) to finish before teleporting.
            // 360ms = 350ms duration + 10ms buffer.
            setTimeout(teleportIfNeeded, 360);
        }

        // Using Pointer Events (not separate mouse/touch handlers) gives us a
        // single unified code path for all input devices.
        let pointerStartX = 0;
        let pointerStartY = 0;
        let isDragging = false;
        let baseOffset = 0;     // track offset captured at drag start
        let intentDecided = false;  // true once we know the scroll axis
        let isHorizontal = false;

        // Minimum movement (px) before we commit to a scroll axis.
        // Small enough to feel responsive, large enough to avoid false positives.
        const INTENT_THRESHOLD = 8;
        // Minimum horizontal drag (px) required to advance to the next card.
        const STEP_THRESHOLD = 40;

        const pointerDown = (e) => {
            if (isStepping) return;
            // Ignore non-primary mouse buttons (right-click, middle-click)
            if (e.pointerType === 'mouse' && e.button !== 0) return;

            isDragging = true;
            intentDecided = false;
            isHorizontal = false;
            pointerStartX = e.clientX;
            pointerStartY = e.clientY;
            // Read the actual rendered translateX from the DOM instead of recalculating
            // from currentIndex. This prevents a jump when the rendered position diverged
            // from the theoretical one (e.g. after teleport + subpixel rounding, or resize).
            const matrix = new DOMMatrix(getComputedStyle(track).transform);
            baseOffset = isRTL ? matrix.m41 : -matrix.m41;

            // Capture the pointer so we receive move/up even if it leaves the element
            track.setPointerCapture(e.pointerId);
            track.style.transition = 'none';
            track.style.cursor = 'grabbing';
        };

        const pointerMove = (e) => {
            if (!isDragging) return;

            const dx = e.clientX - pointerStartX;
            const dy = e.clientY - pointerStartY;

            // Decide scroll axis once movement exceeds the intent threshold.
            // We use Euclidean distance so diagonal movement doesn't bias either axis.
            if (!intentDecided && Math.sqrt(dx * dx + dy * dy) >= INTENT_THRESHOLD) {
                isHorizontal = Math.abs(dx) >= Math.abs(dy);
                intentDecided = true;

                if (!isHorizontal) {
                    // Vertical intent → release control so the page can scroll normally
                    isDragging = false;
                    track.style.cursor = 'grab';
                    return;
                }

                // Horizontal intent confirmed: take full control.
                // touch-action:none prevents the browser from triggering the
                // Android "back" gesture or any other native swipe behaviour.
                track.style.touchAction = 'none';
            }

            if (!intentDecided || !isHorizontal) return;

            // Prevent the page from scrolling while we handle the drag
            e.preventDefault();

            const dragDelta = isRTL ? -dx : dx;
            const absDelta = Math.abs(dragDelta);

            // Below STEP_THRESHOLD: 1:1 follow so the card never jumps at gesture start.
            // Above STEP_THRESHOLD: resistance kicks in (20% of the excess) so the card
            // never visually flies past its neighbour during a fast swipe.
            const clamped = Math.sign(dragDelta) * (absDelta <= STEP_THRESHOLD
                ? absDelta
                : STEP_THRESHOLD + (absDelta - STEP_THRESHOLD) * 0.2
            );
            const rawOffset = baseOffset - clamped;
            track.style.transform = `translateX(${isRTL ? rawOffset : -rawOffset}px)`;
        };

        const pointerUp = (e) => {
            if (!isDragging) return;
            isDragging = false;
            track.style.cursor = 'grab';
            // Restore pan-y so the next gesture can scroll the page vertically if needed
            track.style.touchAction = 'pan-y';

            if (!intentDecided || !isHorizontal) return;

            const dx = e.clientX - pointerStartX;
            const normalizedDx = isRTL ? -dx : dx;

            if (Math.abs(normalizedDx) >= STEP_THRESHOLD) {
                // Always advance exactly one card regardless of how far/fast the user swiped
                step(normalizedDx < 0 ? 1 : -1);
            } else {
                // Not far enough — spring back to the current card
                setPosition(getOffset(currentIndex), true);
                setTimeout(() => { isStepping = false; }, 360);
            }
        };

        track.addEventListener('pointerdown', pointerDown);
        track.addEventListener('pointermove', pointerMove, { passive: false });
        track.addEventListener('pointerup', pointerUp);
        track.addEventListener('pointercancel', pointerUp); // e.g. incoming call interrupts touch
        // Suppress the long-press context menu on mobile which can interfere with dragging
        track.addEventListener('contextmenu', e => e.preventDefault());

        // Button controls
        // In RTL layouts swap the chevron icons and DOM order of the buttons
        if (isRTL) {
            const prevIcon = prevBtn.querySelector('.material-symbols-rounded');
            const nextIcon = nextBtn.querySelector('.material-symbols-rounded');
            if (prevIcon) prevIcon.textContent = 'chevron_right';
            if (nextIcon) nextIcon.textContent = 'chevron_left';
            if (prevBtn.parentNode) prevBtn.parentNode.insertBefore(nextBtn, prevBtn);
        }

        const nextClick = (e) => { e.preventDefault(); step(isRTL ? -1 : 1); };
        const prevClick = (e) => { e.preventDefault(); step(isRTL ? 1 : -1); };

        nextBtn.addEventListener('click', nextClick);
        prevBtn.addEventListener('click', prevClick);

        // Recalculate card sizes and reposition without animation.
        // Debounced to avoid thrashing during a continuous resize drag.
        let resizeTimer;
        const resizeHandler = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                applyCardSizes();
                setPosition(getOffset(currentIndex), false);
            }, 200);
        };
        window.addEventListener('resize', resizeHandler);

        // Store references for destroyCarousel()
        carouselInstance = {
            track, prevBtn, nextBtn,
            resizeHandler, nextClick, prevClick,
            pointerDown, pointerMove, pointerUp,
        };
    }

    // Called by i18n.js after a language switch to reload translated testimonials
    window.reloadTestimonials = function() {
        const testimonials = loadTestimonials();
        renderTestimonials(testimonials);
        setTimeout(() => { initializeCarousel(); }, 100);
    };

    // Initialize testimonials with event-based approach
    function init() {
        window.addEventListener('i18nReady', function() {
            const testimonials = loadTestimonials();
            renderTestimonials(testimonials);
            setTimeout(() => { initializeCarousel(); }, 100);
        });

        // Handle the case where i18n was already ready before this script ran
        if (window.i18n && window.i18n.translations && window.i18n.translations.testimonials) {
            const testimonials = loadTestimonials();
            renderTestimonials(testimonials);
            setTimeout(() => { initializeCarousel(); }, 100);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
