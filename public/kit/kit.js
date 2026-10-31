// Shared kit behaviour: theme, header, drawer, pill tabs, lit cards, word swap, scroll to top
(function () {
    'use strict';

    const THEME_KEY = 'morphe-theme';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    // Theme
    function storedTheme() {
        try {
            const v = localStorage.getItem(THEME_KEY);
            return v === 'light' || v === 'dark' ? v : null;
        } catch (e) {
            return null;
        }
    }

    function systemTheme() {
        return systemDark.matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const sun = document.getElementById('theme-icon-sun');
        const moon = document.getElementById('theme-icon-moon');
        if (sun && moon) {
            sun.classList.toggle('hidden', theme === 'dark');
            moon.classList.toggle('hidden', theme !== 'dark');
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme === 'dark' ? '#18181b' : '#ffffff');
        window.dispatchEvent(new CustomEvent('kit:theme', { detail: theme }));
    }

    const theme = {
        current: storedTheme() || systemTheme(),
        toggle() {
            this.current = this.current === 'dark' ? 'light' : 'dark';
            // Forget the choice when it matches the system, so the site follows the system again
            try {
                if (this.current === systemTheme()) localStorage.removeItem(THEME_KEY);
                else localStorage.setItem(THEME_KEY, this.current);
            } catch (e) { /* storage blocked */ }
            applyTheme(this.current);
        }
    };

    systemDark.addEventListener('change', () => {
        if (!storedTheme()) {
            theme.current = systemTheme();
            applyTheme(theme.current);
        }
    });

    // Drawer
    function setupDrawer() {
        const toggle = document.querySelector('.mobile-menu-toggle');
        const drawer = document.getElementById('mobile-drawer');
        if (!toggle || !drawer) return;
        const scrim = drawer.querySelector('.drawer-scrim');
        const icon = toggle.querySelector('.material-symbols-rounded');

        function swapIcon(name) {
            if (!icon) return;
            icon.classList.add('swap-out');
            setTimeout(() => {
                icon.textContent = name;
                icon.classList.remove('swap-out');
                icon.classList.add('swap-in');
                setTimeout(() => icon.classList.remove('swap-in'), 180);
            }, 180);
        }

        function open() {
            drawer.classList.add('open');
            toggle.classList.add('is-open');
            toggle.setAttribute('aria-expanded', 'true');
            swapIcon('close');
            document.body.style.overflow = 'hidden';
        }

        function close() {
            if (!drawer.classList.contains('open')) return;
            drawer.classList.add('closing');
            toggle.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
            swapIcon('menu');
            setTimeout(() => {
                drawer.classList.remove('open', 'closing');
                document.body.style.overflow = '';
            }, 220);
        }

        toggle.addEventListener('click', () => drawer.classList.contains('open') ? close() : open());
        if (scrim) scrim.addEventListener('click', close);
        drawer.querySelectorAll('.drawer-link').forEach(link => link.addEventListener('click', close));
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    }

    // Header underline follows hover and rests on the current page
    function setupNavIndicator() {
        const links = document.querySelector('.nav-links');
        if (!links) return;
        let bar = links.querySelector('.nav-indicator');
        if (!bar) {
            bar = document.createElement('span');
            bar.className = 'nav-indicator';
            bar.setAttribute('aria-hidden', 'true');
            links.appendChild(bar);
        }
        const current = () => links.querySelector('.nav-link.active, .nav-link[aria-current="page"]');

        function place(link) {
            if (!link || !links.offsetParent) {
                bar.classList.remove('shown');
                return;
            }
            const pad = parseFloat(getComputedStyle(link).paddingLeft) || 0;
            bar.style.left = (link.offsetLeft + pad) + 'px';
            bar.style.width = Math.max(0, link.offsetWidth - pad * 2) + 'px';
            bar.classList.add('shown');
        }

        links.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('mouseenter', () => place(link));
            link.addEventListener('focus', () => place(link));
        });
        links.addEventListener('mouseleave', () => place(current()));
        window.addEventListener('resize', () => place(current()));
        // Pages fire kit:nav after changing which link is current
        window.addEventListener('kit:nav', () => place(current()));
        window.addEventListener('i18nReady', () => place(current()));
        window.addEventListener('i18nLanguageChanged', () => place(current()));
        if (document.fonts) document.fonts.ready.then(() => place(current()));
        place(current());
    }

    // One passive scroll listener for the header shadow and the scroll to top button
    function setupScroll() {
        const navbar = document.querySelector('.navbar');
        const toTop = document.getElementById('scroll-to-top');
        let ticking = false;

        function update() {
            ticking = false;
            const y = window.scrollY;
            if (navbar) navbar.classList.toggle('scrolled', y > 24);
            if (toTop) toTop.classList.toggle('visible', y > 400);
        }

        window.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });

        if (toTop) {
            toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' }));
        }
        update();
    }

    // Lit card edges track the pointer
    function setupLit() {
        document.addEventListener('pointermove', e => {
            const card = e.target instanceof Element ? e.target.closest('.lit') : null;
            if (!card) return;
            const r = card.getBoundingClientRect();
            card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
            card.style.setProperty('--my', (e.clientY - r.top) + 'px');
        }, { passive: true });
    }

    // Pill tabs: the gradient pill slides to the active tab
    function placePill(group) {
        const pill = group.querySelector(':scope > .kit-pill');
        const active = group.querySelector(':scope > button.active, :scope > button[aria-selected="true"]');
        if (!pill || !active || !group.offsetParent) return;
        pill.style.left = active.offsetLeft + 'px';
        pill.style.top = active.offsetTop + 'px';
        pill.style.width = active.offsetWidth + 'px';
        pill.style.height = active.offsetHeight + 'px';
    }

    function setupPillTabs(root) {
        (root || document).querySelectorAll('.pill-tabs').forEach(group => {
            if (!group.querySelector(':scope > .kit-pill')) {
                const pill = document.createElement('span');
                pill.className = 'kit-pill';
                pill.setAttribute('aria-hidden', 'true');
                group.prepend(pill);
            }
            placePill(group);
        });
    }

    function placeAllPills() {
        document.querySelectorAll('.pill-tabs').forEach(placePill);
    }

    // Word swap: cycles words inside a .word-swap element with a gradient wipe
    function wordSwap(el, words, opts) {
        const options = Object.assign({ hold: 2600, loop: true, startIndex: 0, onDone: null }, opts);
        // startIndex -1 means the word in the markup is shown first and the list starts after it
        let index = options.startIndex;
        let timer = null;

        function show(text) {
            const old = el.querySelector('.word:not(.out)');
            const next = document.createElement('span');
            next.className = 'word in';
            next.textContent = text;
            if (old) {
                old.classList.remove('in');
                old.classList.add('out');
                old.setAttribute('aria-hidden', 'true');
                setTimeout(() => old.remove(), 380);
            }
            el.appendChild(next);
            next.addEventListener("animationend", () => next.classList.remove("in"), { once: true });
        }

        function step() {
            const list = typeof words === 'function' ? words() : words;
            if (!list.length) return;
            index += 1;
            if (index >= list.length) {
                if (!options.loop) {
                    if (options.onDone) options.onDone();
                    return;
                }
                index = 0;
            }
            show(list[index]);
            timer = setTimeout(step, options.hold);
        }

        const api = {
            start(delay) {
                if (reduceMotion.matches) return api;
                clearTimeout(timer);
                timer = setTimeout(step, delay == null ? options.hold : delay);
                return api;
            },
            stop() {
                clearTimeout(timer);
                return api;
            },
            set(text) {
                const cur = el.querySelector('.word:not(.out)');
                if (cur) cur.textContent = text;
                else show(text);
                return api;
            },
            get index() { return index; }
        };

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) clearTimeout(timer);
        });
        return api;
    }

    function init() {
        applyTheme(theme.current);
        const toggle = document.getElementById('theme-toggle');
        if (toggle) toggle.addEventListener('click', () => theme.toggle());
        setupDrawer();
        setupNavIndicator();
        setupScroll();
        setupLit();
        setupPillTabs();
        window.addEventListener('resize', placeAllPills);
        window.addEventListener('i18nReady', placeAllPills);
        window.addEventListener('i18nLanguageChanged', placeAllPills);
        if (document.fonts) document.fonts.ready.then(placeAllPills);
    }

    window.kit = { theme, wordSwap, setupPillTabs, placePill, placeAllPills, reduceMotion };
    // Old name kept for scripts that call window.themeManager
    window.themeManager = { toggleTheme: () => theme.toggle(), get currentTheme() { return theme.current; } };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
