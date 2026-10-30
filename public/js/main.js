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

// Scroll-reveal animations
document.addEventListener('DOMContentLoaded', function() {
    // Mark elements that should animate on scroll.
    // Classes are added here (not in HTML) so content is always visible without JS.

    // Simple fade-up elements
    const revealSelectors = [
        '.section-header',
        '.hero-content',
        '.faq-item',
        '.show-more-section',
        '.changelog-hero',
        '.changelog-filters',
        '.donate-card',
        '.donate-tiers-header',
        '.donate-backers',
        '.donate-sponsors-card',
        '.community-card',
        '.microg-feature',
        '.translate-step',
        '.translate-why-item',
        // App Features — animate the tab bar and the panel wrapper as single units
        // (internals are managed by app-features.js carousel, don't touch them)
        '.app-tabs',
        '.app-features-panel-wrapper',
        // Testimonials — animate the whole carousel block as one unit
        // (internals are managed by testimonials.js, don't touch them)
        '.testimonials-carousel',
    ];

    document.querySelectorAll(revealSelectors.join(', ')).forEach(el => {
        el.classList.add('will-reveal');
    });

    // Staggered containers — children animate in sequence
    const staggerSelectors = [
        '.features-grid',
        '.donate-tiers',
    ];

    document.querySelectorAll(staggerSelectors.join(', ')).forEach(container => {
        container.classList.add('will-reveal-stagger');
        Array.from(container.children).forEach((child, i) => {
            child.style.setProperty('--reveal-delay', `${i * 80}ms`);
        });
    });

    // Single observer for everything
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -60px 0px'
    });

    document.querySelectorAll('.will-reveal, .will-reveal-stagger').forEach(el => {
        observer.observe(el);
    });
});

// Mobile device detection for download button visibility
(function() {
    var ua = navigator.userAgent;
    var isMobile = /android|iphone|ipad|ipod/i.test(ua) ||
        (navigator.userAgentData && /android/i.test(navigator.userAgentData.platform));

    if (isMobile) {
        if (document.body) {
            document.body.classList.add('is-mobile-detected');
        } else {
            document.addEventListener('DOMContentLoaded', function() {
                document.body.classList.add('is-mobile-detected');
            });
        }
    }
})();
