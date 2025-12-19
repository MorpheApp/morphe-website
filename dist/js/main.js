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
    const seriousTestimonials = [
        {
            text: "I used to spend hours configuring patches manually. Now I just click 'Patch' and go make coffee. By the time I'm back, it's done. Revolutionary!",
            author: "Lisa Park",
            role: "Coffee Lover & Developer",
            avatar: "L"
        },
        {
            text: "Every other patcher feels like performing blindfolded brain surgery. But with Morphe it's a few clicks and my patched app is supercharged and greater than ever.",
            author: "Alex Chen",
            role: "Power User",
            avatar: "A"
        },
        {
            text: "It's like Vanced, but better, and without the weird corporate party vibes.",
            author: "Sarah Johnson",
            role: "Former Vanced User",
            avatar: "S"
        },
        {
            text: "I clicked a few buttons and my phone became cooler than me.",
            author: "Jamie Rodriguez",
            role: "Tech Enthusiast",
            avatar: "J"
        },
        {
            text: "My 87 year old grandma asked me why my YouTube looks different. I showed her Morphe and now she's patching apps for her entire retirement community.",
            author: "David Kim",
            role: "Proud Grandson",
            avatar: "D"
        },
        {
            text: "I tried other patchers and my phone caught fire. With Morphe, my phone is just perfectly modified. 10/10 would not spontaneously combust again.",
            author: "Ryan Martinez",
            role: "Fire Safety Advocate",
            avatar: "R"
        },
        {
            text: "My cat knocked my phone off the table while Morphe was patching. The phone survived and patching still completed successfully. Cat approved.",
            author: "Emma Williams",
            role: "Cat Owner",
            avatar: "E"
        },
        {
            text: "I showed Morphe to my tech-illiterate dad. He now patches apps better than I do. I'm questioning my entire career in IT.",
            author: "Tom Anderson",
            role: "Existential Crisis Haver",
            avatar: "T"
        },
        {
            text: "I was skeptical at first, but Morphe proved me wrong. The UI is intuitive and the results are incredible. Best decision I made this year.",
            author: "Nina Petrov",
            role: "Software Engineer",
            avatar: "N"
        },
        {
            text: "The documentation is crystal clear and the community is incredibly helpful. I had my app patched and running in minutes.",
            author: "Marcus Johnson",
            role: "Android Developer",
            avatar: "M"
        }
    ];

    const funnyTestimonials = [
        {
            text: "My ex-girlfriend got back together with me after I started using Morphe. Coincidence? I think not!",
            author: "Mike Thompson",
            role: "Relationship Expert",
            avatar: "M"
        },
        {
            text: "Morphe is the only thing saving me from 60 second unskippable ads about toothpaste.",
            author: "Casey Morgan",
            role: "Oral Hygiene Survivor",
            avatar: "C"
        },
        {
            text: "I thought Morphe was an obscure Greek god. Turns out it's better.",
            author: "Oliver Grant",
            role: "College History Major",
            avatar: "O"
        },
        {
            text: "Before Morphe, I thought APK was a new K-pop band.",
            author: "Jeff",
            role: "Confused Uncle",
            avatar: "J"
        },
        {
            text: "I used Morphe once and now I have superpowers. Not sure if it's related but I'm pretty sure it is.",
            author: "Peter Chen",
            role: "Superhero Enthusiast",
            avatar: "P"
        },
        {
            text: "Morphe fixed my WiFi, paid my taxes, and solved world hunger. Actually no, but it did patch YouTube perfectly.",
            author: "Sarah Williams",
            role: "Over-Exaggerator",
            avatar: "S"
        },
        {
            text: "I showed Morphe to my dog and now he codes better than me. I think I need a new career.",
            author: "Kevin Park",
            role: "Unemployed Developer",
            avatar: "K"
        },
        {
            text: "Morphe is so easy to use, even my grandma uses it. Now she's the coolest person in her nursing home.",
            author: "Helen Foster",
            role: "Proud Granddaughter",
            avatar: "H"
        },
        {
            text: "I clicked the wrong button and accidentally became a millionaire. Not sure how it happened but Morphe was involved.",
            author: "Lucky Luke",
            role: "Accidental Billionaire",
            avatar: "L"
        },
        {
            text: "Scientists say Morphe defies the laws of physics. I'm just happy it works.",
            author: "Dr. Sheldon Lee",
            role: "Theoretical Physicist",
            avatar: "D"
        }
    ];

    // Shuffle array function (Fisher-Yates)
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    // Select N random testimonials from array
    function selectRandomTestimonials(array, count) {
        const shuffled = shuffleArray(array);
        return shuffled.slice(0, count);
    }

    // Create testimonial card HTML structure
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

    // Every time the page loads, the selection changes
    const allTestimonials = [...seriousTestimonials, ...funnyTestimonials];

    // Shuffle the final list for more variety
    const shuffledFinal = shuffleArray(allTestimonials);

    // Insert testimonials into DOM
    const grid = document.getElementById('testimonials-grid');
    if (grid) {
        grid.innerHTML = shuffledFinal.map(t => createTestimonialCard(t)).join('');
    }

    // Initialize carousel with touch/swipe support
    initializeCarousel();
});

function initializeCarousel() {
    const carousel = document.querySelector('.testimonials-carousel');
    if (!carousel) return;

    const grid = carousel.querySelector('.testimonials-grid');
    const prevBtn = carousel.querySelector('.carousel-button.prev');
    const nextBtn = carousel.querySelector('.carousel-button.next');
    const cards = Array.from(grid.querySelectorAll('.testimonial-card'));

    if (cards.length === 0) return;

    let currentIndex = 0;
    const totalCards = cards.length; // 10 testimonials
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

    // Mouse events for desktop testing (also works as drag alternative)
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
