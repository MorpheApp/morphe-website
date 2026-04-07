// Testimonials Module
// Loads testimonials from i18n translations and handles carousel

(function () {
  'use strict';

  var animating = false;

  /* ── Build a testi-card element ──────────────────────────────── */
  function createCard(t) {
    var avatar = t.author ? t.author.charAt(0).toUpperCase() : '?';
    var card = document.createElement('div');
    card.className = 'testi-card';
    card.innerHTML =
      '<div class="testi-quote">' + escapeHtml(t.text) + '</div>' +
      '<div class="testi-author">' +
        '<div class="testi-avatar">' + avatar + '</div>' +
        '<div class="testi-info">' +
          '<div class="testi-name">' + escapeHtml(t.author) + '</div>' +
          '<div class="testi-role">' + escapeHtml(t.role || '') + '</div>' +
          '<div class="testi-stars">★★★★★</div>' +
        '</div>' +
      '</div>';
    return card;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Extract testimonials from i18n ──────────────────────────── */
  function loadTestimonials() {
    if (!window.i18n || !window.i18n.translations || !window.i18n.translations.testimonials) return [];
    var section = window.i18n.translations.testimonials;
    var list = [];
    var i = 1;
    while (section['quote_' + i]) {
      var q = section['quote_' + i];
      list.push({ text: q.text || '', author: q.author || 'User', role: q.role || '' });
      i++;
    }
    var order = [2,9,3,16,4,18,5,10,6,11,7,13,12,15,17,14,19,8].map(function(n){ return n - 1; });
    return order.filter(function(idx){ return idx >= 0 && idx < list.length; }).map(function(idx){ return list[idx]; });
  }

  /* ── Render into DOM ─────────────────────────────────────────── */
  function render(testimonials) {
    var track = document.getElementById('testiTrack');
    if (!track) return;
    track.innerHTML = '';
    if (!testimonials.length) return;
    testimonials.forEach(function(t) { track.appendChild(createCard(t)); });
  }

  /* ── Carousel (infinite scroll by DOM reorder) ───────────────── */
  function next() {
    if (animating) return;
    var track = document.getElementById('testiTrack');
    if (!track || !track.children.length) return;
    animating = true;
    var first = track.firstElementChild;
    var w = first.offsetWidth + 16;
    track.style.transition = 'transform 0.5s cubic-bezier(0.05,0.7,0.1,1)';
    track.style.transform = 'translateX(-' + w + 'px)';
    setTimeout(function() {
      track.style.transition = 'none';
      track.appendChild(first);
      track.style.transform = 'translateX(0)';
      animating = false;
    }, 520);
  }

  function prev() {
    if (animating) return;
    var track = document.getElementById('testiTrack');
    if (!track || !track.children.length) return;
    animating = true;
    var last = track.lastElementChild;
    var w = track.firstElementChild.offsetWidth + 16;
    track.style.transition = 'none';
    track.insertBefore(last, track.firstElementChild);
    track.style.transform = 'translateX(-' + w + 'px)';
    track.offsetHeight;
    track.style.transition = 'transform 0.5s cubic-bezier(0.05,0.7,0.1,1)';
    track.style.transform = 'translateX(0)';
    setTimeout(function() { animating = false; }, 520);
  }

  function initCarousel() {
    var cNext = document.getElementById('cNext');
    var cPrev = document.getElementById('cPrev');
    if (cNext) cNext.addEventListener('click', next);
    if (cPrev) cPrev.addEventListener('click', prev);

    var track = document.getElementById('testiTrack');
    if (track) {
      // Touch swipe
      var touchStartX = 0;
      track.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', function(e) {
        var delta = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
      });
      // Mouse drag
      var mouseStartX = 0;
      var dragging = false;
      track.addEventListener('mousedown', function(e) {
        dragging = true;
        mouseStartX = e.clientX;
        track.style.cursor = 'grabbing';
        e.preventDefault();
      });
      document.addEventListener('mouseup', function(e) {
        if (!dragging) return;
        dragging = false;
        track.style.cursor = 'grab';
        var delta = mouseStartX - e.clientX;
        if (Math.abs(delta) > 50) delta > 0 ? next() : prev();
      });
    }
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    window.addEventListener('i18nReady', function() {
      render(loadTestimonials());
      initCarousel();
    });
    if (window.i18n && window.i18n.translations && window.i18n.translations.testimonials) {
      render(loadTestimonials());
      initCarousel();
    }
  }

  window.reloadTestimonials = function() {
    render(loadTestimonials());
    setTimeout(initCarousel, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
