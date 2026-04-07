(function () {
  'use strict';

  /* ── Language dropdown ─────────────────────────────────────── */
  var SUPPORTED_LOCALES = [
    {code:'en',name:'English'},{code:'cs-CZ',name:'Čeština'},
    {code:'de-DE',name:'Deutsch'},{code:'es-ES',name:'Español'},
    {code:'fr-FR',name:'Français'},{code:'it-IT',name:'Italiano'},
    {code:'nl-NL',name:'Nederlands'},{code:'pl-PL',name:'Polski'},
    {code:'pt-BR',name:'Português (BR)'},{code:'pt-PT',name:'Português (PT)'},
    {code:'ru-RU',name:'Русский'},{code:'sk-SK',name:'Slovenčina'},
    {code:'vi-VN',name:'Tiếng Việt'},{code:'tr-TR',name:'Türkçe'},
    {code:'uk-UA',name:'Українська'},{code:'ja-JP',name:'日本語'},
    {code:'ko-KR',name:'한국어'},{code:'zh-CN',name:'中文'}
  ];
  var LOCALE_CODES = SUPPORTED_LOCALES.map(function(l){ return l.code; });
  var LANG_KEY = 'morphe-language';

  function getCurrentLang() {
    // Prefer existing i18n system if available
    if (window.i18n && window.i18n.getCurrentLanguage) {
      return window.i18n.getCurrentLanguage();
    }
    var saved = localStorage.getItem(LANG_KEY);
    if (saved && LOCALE_CODES.includes(saved)) return saved;
    var br = navigator.language || 'en';
    if (LOCALE_CODES.includes(br)) return br;
    var base = br.split('-')[0];
    var reg = LOCALE_CODES.find(function(c){ return c.startsWith(base + '-'); });
    return reg || (LOCALE_CODES.includes(base) ? base : 'en');
  }

  function closeAllMenus() {
    document.querySelectorAll('.lang-menu').forEach(function(m){ m.classList.remove('open'); });
    document.querySelectorAll('.lang-trigger, .lang-trigger-compact').forEach(function(t){ t.classList.remove('open'); });
  }

  function setLang(code) {
    if (window.i18n && window.i18n.setLanguage) {
      window.i18n.setLanguage(code);
    } else {
      localStorage.setItem(LANG_KEY, code);
      location.reload();
    }
    // Update selected state in all menus
    document.querySelectorAll('.lang-menu-item').forEach(function(item) {
      item.classList.toggle('selected', item.getAttribute('data-code') === code);
    });
    // Update footer label
    var label = document.getElementById('langLabelFooter');
    if (label) {
      var locale = SUPPORTED_LOCALES.find(function(l){ return l.code === code; });
      if (locale) label.textContent = locale.name;
    }
  }

  function buildMenu(triggerId, menuId) {
    var trigger = document.getElementById(triggerId);
    var menu = document.getElementById(menuId);
    if (!trigger || !menu) return;

    var scroll = document.createElement('div');
    scroll.className = 'lang-menu-scroll';
    var current = getCurrentLang();

    SUPPORTED_LOCALES.forEach(function(locale) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lang-menu-item' + (locale.code === current ? ' selected' : '');
      btn.setAttribute('data-code', locale.code);
      btn.innerHTML =
        '<span class="material-symbols-rounded check-mark">check</span>' +
        '<span class="lang-name">' + locale.name + '</span>';
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();
        setLang(locale.code);
      });
      scroll.appendChild(btn);
    });
    menu.appendChild(scroll);

    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var wasOpen = menu.classList.contains('open');
      closeAllMenus();
      if (!wasOpen) {
        menu.classList.add('open');
        trigger.classList.add('open');
      }
    });
  }

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.lang-dropdown')) closeAllMenus();
  });

  /* ── Theme toggle ──────────────────────────────────────────── */
  function getTheme() {
    return localStorage.getItem('morphe-theme') ||
      (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  }

  function updateThemeIcon(theme) {
    var icon = document.getElementById('themeIcon');
    if (icon) icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
  }

  function initThemeToggle() {
    updateThemeIcon(getTheme());
    var btn = document.getElementById('themeToggle');
    if (!btn) return;
    btn.addEventListener('click', function() {
      var next = getTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('morphe-theme', next);
      updateThemeIcon(next);
      // Keep existing theme-manager in sync if present
      if (window.themeManager) window.themeManager.currentTheme = next;
    });
  }

  /* ── Top bar scroll / active nav ──────────────────────────── */
  function initScrollBehavior() {
    var topBar = document.getElementById('topBar');
    var fab = document.getElementById('fab');
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-link, .drawer-link');
    var ticking = false;

    window.addEventListener('scroll', function() {
      if (ticking) return;
      requestAnimationFrame(function() {
        var y = window.scrollY;
        if (topBar) topBar.classList.toggle('scrolled', y > 50);
        if (fab)    fab.classList.toggle('visible', y > 400);

        // Active section highlight
        var current = '';
        sections.forEach(function(s) {
          if (y >= s.offsetTop - 164) current = s.id;
        });
        navLinks.forEach(function(link) {
          var href = link.getAttribute('href');
          if (href && href.startsWith('#')) {
            link.classList.toggle('active', href === '#' + current);
          }
        });
        ticking = false;
      });
      ticking = true;
    }, { passive: true });
  }

  /* ── Mobile drawer ─────────────────────────────────────────── */
  function initDrawer() {
    var drawer = document.getElementById('drawer');
    var topBar = document.getElementById('topBar');
    var menuIcon = document.getElementById('menuIconToggle');
    if (!drawer) return;

    function toggleDrawer(forceClose) {
      var open = forceClose === true ? false : !drawer.classList.contains('open');
      if (open) {
        drawer.classList.add('open');
        if (topBar) topBar.classList.add('menu-open');
        if (menuIcon) { menuIcon.style.transform = 'rotate(90deg)'; menuIcon.textContent = 'close'; }
      } else {
        drawer.classList.remove('open');
        if (topBar) topBar.classList.remove('menu-open');
        if (menuIcon) { menuIcon.style.transform = 'rotate(0)'; menuIcon.textContent = 'menu'; }
      }
    }

    window.closeDrawer = function() { toggleDrawer(true); };

    var menuBtn = document.getElementById('menuBtn');
    var scrim = document.getElementById('scrim');
    if (menuBtn) menuBtn.addEventListener('click', function() { toggleDrawer(); });
    if (scrim) scrim.addEventListener('click', function() { toggleDrawer(true); });
  }

  /* ── Smooth scroll for anchor links ────────────────────────── */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(a) {
      a.addEventListener('click', function(e) {
        var target = document.querySelector(a.getAttribute('href'));
        if (target) {
          e.preventDefault();
          window.scrollTo({ top: target.offsetTop - 64, behavior: 'smooth' });
        }
      });
    });
  }

  /* ── FAB ────────────────────────────────────────────────────── */
  function initFAB() {
    var fab = document.getElementById('fab');
    if (fab) fab.addEventListener('click', function() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ── FAQ accordion ──────────────────────────────────────────── */
  function initFAQ() {
    var items = document.querySelectorAll('.faq-item');
    document.querySelectorAll('.faq-q').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var item = btn.closest('.faq-item');
        var wasActive = item.classList.contains('active');
        items.forEach(function(i) { i.classList.remove('active'); });
        if (!wasActive) item.classList.add('active');
      });
    });
  }

  /* ── Features panel segmented tabs ─────────────────────────── */
  function initFeatureTabs() {
    var segBtns = document.querySelectorAll('.seg-btn');
    var panel = document.getElementById('featPanel');
    var pages = document.querySelectorAll('.features-page');
    var current = 0;

    function goTo(idx) {
      current = idx;
      segBtns.forEach(function(b, i) { b.classList.toggle('active', i === idx); });
      if (panel) panel.style.transform = 'translateX(-' + (100 * idx) + '%)';
    }

    segBtns.forEach(function(btn, i) {
      btn.addEventListener('click', function() { goTo(i); });
    });

    // Touch swipe + mouse drag on panel wrapper
    if (panel) {
      var wrapper = panel.parentElement;
      var startX = 0;
      var dragging = false;

      // Touch
      wrapper.addEventListener('touchstart', function(e) { startX = e.touches[0].clientX; }, { passive: true });
      wrapper.addEventListener('touchend', function(e) {
        var delta = startX - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) {
          if (delta > 0 && current < pages.length - 1) goTo(current + 1);
          else if (delta < 0 && current > 0) goTo(current - 1);
        }
      });

      // Mouse drag
      wrapper.addEventListener('mousedown', function(e) {
        dragging = true;
        startX = e.clientX;
        wrapper.style.cursor = 'grabbing';
        e.preventDefault();
      });
      document.addEventListener('mouseup', function(e) {
        if (!dragging) return;
        dragging = false;
        wrapper.style.cursor = '';
        var delta = startX - e.clientX;
        if (Math.abs(delta) > 50) {
          if (delta > 0 && current < pages.length - 1) goTo(current + 1);
          else if (delta < 0 && current > 0) goTo(current - 1);
        }
      });
    }
  }

  /* ── Intersection Observer for .anim ───────────────────────── */
  function initAnimations() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('.anim').forEach(function(el) { observer.observe(el); });
  }

  /* ── Download URL: fetch latest APK from GitHub releases ───── */
  async function fetchLatestAPK() {
    try {
      var res = await fetch('https://api.github.com/repos/MorpheApp/morphe-manager/releases/latest');
      var data = await res.json();
      var apk = data.assets && data.assets.find(function(a) { return a.name.endsWith('.apk'); });
      if (apk) {
        document.querySelectorAll('a.btn-filled').forEach(function(a) {
          if (a.href.indexOf('github.com/MorpheApp') !== -1) a.href = apk.browser_download_url;
        });
      }
    } catch(e) { /* silently fail — link falls back to /releases/latest */ }
  }

  /* ── DMCA badge refurl fix ──────────────────────────────────── */
  function fixDMCABadge() {
    var badges = document.querySelectorAll('a.dmca-badge');
    if (badges[0] && badges[0].getAttribute('href').indexOf('refurl') < 0) {
      badges.forEach(function(b) {
        b.href = b.href + (b.href.indexOf('?') === -1 ? '?' : '&') + 'refurl=' + document.location;
      });
    }
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    buildMenu('langTriggerBar', 'langMenuBar');
    buildMenu('langTriggerMobile', 'langMenuMobile');
    buildMenu('langTriggerFooter', 'langMenuFooter');

    // Set footer language label immediately and keep in sync with i18n
    function updateFooterLabel() {
      var cur = getCurrentLang();
      var loc = SUPPORTED_LOCALES.find(function(l){ return l.code === cur; });
      var label = document.getElementById('langLabelFooter');
      if (label && loc) label.textContent = loc.name;
      // Also sync selected states in all menus
      document.querySelectorAll('.lang-menu-item').forEach(function(item) {
        item.classList.toggle('selected', item.getAttribute('data-code') === cur);
      });
    }
    updateFooterLabel();
    window.addEventListener('i18nReady', updateFooterLabel);
    window.addEventListener('i18nLanguageChanged', updateFooterLabel);

    initThemeToggle();
    initScrollBehavior();
    initDrawer();
    initSmoothScroll();
    initFAB();
    initFAQ();
    initFeatureTabs();
    initAnimations();
    fixDMCABadge();
    fetchLatestAPK();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
