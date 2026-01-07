// Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a link
    const navLinkItems = document.querySelectorAll('.nav-link');
    navLinkItems.forEach(link => {
        link.addEventListener('click', function() {
            navLinks.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
    });
});

// FAQ Accordion
document.addEventListener('DOMContentLoaded', function() {
    const faqQuestions = document.querySelectorAll('.faq-question');

    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.closest('.faq-item');
            const isActive = faqItem.classList.contains('active');

            // Close all FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Open clicked item if it wasn't active
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });
});

// Smooth scroll for anchor links
document.addEventListener('DOMContentLoaded', function() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip if it's just "#"
            if (href === '#') {
                e.preventDefault();
                return;
            }

            const target = document.querySelector(href);

            if (target) {
                e.preventDefault();
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.offsetTop - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
});

// Navbar scroll effect
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            navbar.style.boxShadow = 'var(--shadow-md)';
        } else {
            navbar.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    });
});

// Add active state to nav links based on scroll position
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', function() {
        let current = '';
        const navHeight = document.querySelector('.navbar').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - navHeight - 100;
            const sectionHeight = section.offsetHeight;

            if (window.pageYOffset >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
});

// Intersection Observer for animations
document.addEventListener('DOMContentLoaded', function() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe feature cards
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        observer.observe(card);
    });

    // Observe FAQ items
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        observer.observe(item);
    });

    // Observe crypto cards
    const cryptoCards = document.querySelectorAll('.crypto-card');
    cryptoCards.forEach(card => {
        observer.observe(card);
    });

    // Observe testimonial cards
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    testimonialCards.forEach(card => {
        observer.observe(card);
    });
});

// Testimonials Carousel
document.addEventListener('DOMContentLoaded', function() {
    // Wait for i18n to be loaded
    const loadTestimonials = () => {
        if (!window.i18n || !window.i18n.translations || !window.i18n.translations.testimonials) {
            // i18n not ready yet, try again in 100ms
            setTimeout(loadTestimonials, 100);
            return;
        }

        const testimonialsData = loadTestimonialsFromI18n();
        renderTestimonials(testimonialsData);
        initializeCarousel();
    };

    loadTestimonials();
});

/**
 * Load testimonials from i18n translations with sync fallback
 */
function loadTestimonialsFromI18n() {
    const testimonials = [];
    let testimonialsSection = window.i18n.translations.testimonials;

    // If no testimonials in current language, return empty
    if (!testimonialsSection) {
        console.warn('Testimonials section not found in current language');
        return testimonials;
    }

    return extractTestimonials(testimonialsSection);
}

/**
 * Extract testimonials from a testimonials section object
 */
function extractTestimonials(testimonialsSection) {
    const testimonials = [];
    let index = 1;

    // Keep looking for quote_N until we don't find one
    while (testimonialsSection[`quote_${index}`]) {
        const quote = testimonialsSection[`quote_${index}`];

        // Get first letter for avatar
        const avatar = quote.author ? quote.author.charAt(0).toUpperCase() : '?';

        testimonials.push({
            text: quote.text || '',
            author: quote.author || 'Unknown',
            role: quote.role || '',
            avatar: avatar
        });

        index++;
    }

    // Shuffle testimonials for variety
    return shuffleArray(testimonials);
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

/**
 * Create testimonial card HTML structure
 */
function createTestimonialCard(testimonial) {
    return `
        <div class="testimonial-card">
            <div class="testimonial-content">
                <p class="testimonial-text">
                    ${testimonial.text}
                </p>
            </div>
            <div class="testimonial-author">
                <div class="author-avatar">${testimonial.avatar}</div>
                <div class="author-info">
                    <div class="author-name">${testimonial.author}</div>
                    <div class="author-role">${testimonial.role}</div>
                </div>
            </div>
            <div class="testimonial-rating">
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
            </div>
        </div>
    `;
}

/**
 * Render testimonials into DOM
 */
function renderTestimonials(testimonials) {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) {
        console.error('Testimonials grid element not found');
        return;
    }

    if (testimonials.length === 0) {
        console.warn('No testimonials to display');
        grid.innerHTML = '<p>No testimonials available</p>';
        return;
    }

    grid.innerHTML = testimonials.map(t => createTestimonialCard(t)).join('');
}

/**
 * Reload testimonials when language changes
 * This function is called by i18n.js when language is changed
 */
window.reloadTestimonials = function() {
    const testimonialsData = loadTestimonialsFromI18n();
    renderTestimonials(testimonialsData);
};

/**
 * Initialize carousel with touch/swipe support
 */
function initializeCarousel() {
    const carousel = document.querySelector('.testimonials-carousel');
    if (!carousel) return;

    const grid = carousel.querySelector('.testimonials-grid');
    const prevBtn = carousel.querySelector('.carousel-button.prev');
    const nextBtn = carousel.querySelector('.carousel-button.next');
    const cards = Array.from(grid.querySelectorAll('.testimonial-card'));

    if (cards.length === 0) return;

    let currentIndex = 0;
    const totalCards = cards.length;
    const isMobile = window.innerWidth <= 768;
    const cardsToShow = isMobile ? 1 : 3;

    // Maximum index we can scroll to while showing full cards
    const maxScrollIndex = totalCards - cardsToShow;

    // Touch/Swipe tracking variables
    let touchStartX = 0;
    let touchEndX = 0;
    let isDragging = false;
    let startIndex = 0;

    // Update carousel position based on current index
    function updateCarousel() {
        const cardWidth = grid.querySelector('.testimonial-card').offsetWidth;
        const gap = parseInt(getComputedStyle(grid).gap) || 16;
        const offset = currentIndex * (cardWidth + gap);
        grid.style.transform = `translateX(-${offset}px)`;
        grid.style.transition = 'transform 0.3s ease-out';
    }

    // Touch events for mobile devices
    grid.addEventListener('touchstart', function(e) {
        isDragging = true;
        touchStartX = e.changedTouches[0].screenX;
        startIndex = currentIndex;
        grid.style.transition = 'none'; // Disable animation while dragging
        grid.classList.add('dragging');
    }, false);

    grid.addEventListener('touchend', function(e) {
        isDragging = false;
        grid.classList.remove('dragging');
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, false);

    // Mouse events for desktop
    grid.addEventListener('mousedown', function(e) {
        isDragging = true;
        touchStartX = e.screenX;
        startIndex = currentIndex;
        grid.style.transition = 'none';
        grid.classList.add('dragging');
    }, false);

    grid.addEventListener('mouseup', function(e) {
        isDragging = false;
        grid.classList.remove('dragging');
        touchEndX = e.screenX;
        handleSwipe();
    }, false);

    grid.addEventListener('mouseleave', function() {
        if (isDragging) {
            isDragging = false;
            grid.classList.remove('dragging');
            touchEndX = touchStartX; // Do not count as swipe if mouse left grid
        }
    }, false);

    function handleSwipe() {
        const swipeThreshold = 50; // Minimum distance for swipe (pixels)
        const diff = touchStartX - touchEndX;

        if (Math.abs(diff) < swipeThreshold) {
            // Small swipe - do not change
            updateCarousel();
            return;
        }

        if (diff > 0) {
            // Swipe left → next card
            if (currentIndex >= maxScrollIndex) {
                currentIndex = 0;
            } else {
                currentIndex++;
            }
        } else {
            // Swipe right → previous card
            if (currentIndex <= 0) {
                currentIndex = maxScrollIndex;
            } else {
                currentIndex--;
            }
        }

        updateCarousel();
    }

    nextBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentIndex >= maxScrollIndex) {
            currentIndex = 0;
        } else {
            currentIndex++;
        }
        updateCarousel();
    });

    prevBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (currentIndex <= 0) {
            currentIndex = maxScrollIndex;
        } else {
            currentIndex--;
        }
        updateCarousel();
    });

    // Buttons are NEVER disabled
    prevBtn.disabled = false;
    nextBtn.disabled = false;

    // Handle responsive window resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const newIsMobile = window.innerWidth <= 768;
            if (newIsMobile !== isMobile) {
                location.reload();
            }
            updateCarousel();
        }, 250);
    });

    // Initialize carousel on page load
    updateCarousel();
}
