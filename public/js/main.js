// Mobile Drawer
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const scrim = document.getElementById('drawer-scrim');

    if (!mobileMenuToggle || !drawer) return;

    const menuIcon = mobileMenuToggle.querySelector('.material-symbols-rounded');

    function swapIcon(toIcon) {
        if (!menuIcon) return;
        menuIcon.classList.add('swap-out');
        setTimeout(() => {
            menuIcon.textContent = toIcon;
            menuIcon.classList.remove('swap-out');
            menuIcon.classList.add('swap-in');
            setTimeout(() => menuIcon.classList.remove('swap-in'), 180);
        }, 180);
    }

    function openDrawer() {
        drawer.classList.add('open');
        mobileMenuToggle.classList.add('is-open');
        swapIcon('close');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer.classList.add('closing');
        mobileMenuToggle.classList.remove('is-open');
        swapIcon('menu');
        setTimeout(() => {
            drawer.classList.remove('open', 'closing');
            document.body.style.overflow = '';
        }, 270);
    }

    mobileMenuToggle.addEventListener('click', function() {
        drawer.classList.contains('open') ? closeDrawer() : openDrawer();
    });

    // Close on scrim click
    if (scrim) scrim.addEventListener('click', closeDrawer);

    // Close on drawer link click
    drawer.querySelectorAll('.drawer-link').forEach(link => {
        link.addEventListener('click', closeDrawer);
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
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

// Note: Smooth scroll is now handled by Lenis in smooth-scroll.js for a more premium experience.
// Conflicts with native scrollTo have been removed.

// Navbar scroll effect
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.querySelector('.m3-navbar');

    if (!navbar) return;

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 100) {
            navbar.style.boxShadow = 'var(--shadow-md)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
});

// Active nav links and Scroll Progress
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.m3-nav-link, .nav-link');
    const navbar = document.querySelector('.m3-navbar');
    const progressBar = document.getElementById('scrollProgress');

    if (!navbar) return;

    window.addEventListener('scroll', function() {
        // Handle Active Links
        let current = '';
        const navHeight = navbar.offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - navHeight - 100;
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

        // Handle Progress Bar
        if (progressBar) {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + "%";
        }
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
        '.hero-image',
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

// Scroll to Top Button
document.addEventListener('DOMContentLoaded', function() {
    const scrollToTopBtn = document.getElementById('scroll-to-top');

    if (!scrollToTopBtn) return;

    // Show/hide button based on scroll position
    function toggleScrollButton() {
        const scrollThreshold = 400; // Show after scrolling 400px

        if (window.pageYOffset > scrollThreshold) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    }

    // Smooth scroll to top
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Event listeners
    window.addEventListener('scroll', toggleScrollButton);
    scrollToTopBtn.addEventListener('click', scrollToTop);

    // Initial check
    toggleScrollButton();
});
