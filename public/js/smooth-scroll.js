// Smooth scroll with Lenis
// https://lenis.darkroom.engineering/
(function() {
    'use strict';

    // Load Lenis from CDN
    var script = document.createElement('script');
    script.src = 'https://unpkg.com/lenis@1.1.18/dist/lenis.min.js';
    script.onload = function() {
        var lenis = new Lenis({
            duration: 1.2,
            easing: function(t) {
                return Math.min(1, 1.001 - Math.pow(2, -10 * t));
            },
            orientation: 'vertical',
            gestureOrientation: 'vertical',
            smoothWheel: true,
            wheelMultiplier: 1,
            touchMultiplier: 2
        });

        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Make lenis available globally for anchor link handling
        window.__lenis = lenis;

        // Handle anchor clicks to use Lenis smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                var target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    e.preventDefault();
                    lenis.scrollTo(target, { offset: -100 });
                }
            });
        });

        // Handle scroll-to-top button
        var scrollBtn = document.getElementById('scroll-to-top') || document.querySelector('.scroll-to-top');
        if (scrollBtn) {
            scrollBtn.addEventListener('click', function(e) {
                e.preventDefault();
                lenis.scrollTo(0);
            });
        }
    };
    document.head.appendChild(script);
})();
