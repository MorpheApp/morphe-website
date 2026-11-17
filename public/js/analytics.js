(function() {
  'use strict';

  const WEBSITE_ID = 'cd26cb28-0b3a-4524-be50-f7f69e46fcec';

  // --- Umami Analytics ---
  const analytics = document.createElement('script');
  analytics.defer = true;
  analytics.src = 'https://analytics.morphe.software/script.js';
  analytics.setAttribute('data-website-id', WEBSITE_ID);
  analytics.setAttribute('data-performance', 'true');
  // FAQ items write their id into the #hash on open/close; without this each toggle is a pageview.
  analytics.setAttribute('data-exclude-hash', 'true');
  analytics.onerror = function() {};
  document.head.appendChild(analytics);

  // --- Safety Fallback: Ensure links navigate even if Umami server is down or hanging ---
  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[data-umami-event]');
    if (!link || !link.href || link.target === '_blank') return;

    const targetUrl = link.href;

    // If Umami gets stuck on an offline server and doesn't navigate within 150ms, force navigation
    setTimeout(function() {
      if (window.location.href !== targetUrl) {
        window.location.href = targetUrl;
      }
    }, 150);
  }, true);

  // --- Session Replay ---
  const RECORDER_SAMPLING_RATES = {
    'microg': 0,
    'add-source': 0,
    'changelog': 1.00,
    'donate': 1.00,
    'translate': 1.00,
    'default': 0.10
  };

  const pageKey = window.location.pathname.toLowerCase().split('/').pop();
  const lookupRate = RECORDER_SAMPLING_RATES[pageKey];
  const currentSampleRate = lookupRate !== undefined ? lookupRate : RECORDER_SAMPLING_RATES['default'];

  if (currentSampleRate > 0) {
    // Use a delay before starting anonymous session replay
    // to ignore users who immediately download
    setTimeout(() => {
      const recorder = document.createElement('script');
      recorder.defer = true;
      recorder.src = 'https://analytics.morphe.software/recorder.js';
      recorder.setAttribute('data-website-id', WEBSITE_ID);
      // Dynamically inject the determined sample rate
      recorder.setAttribute('data-sample-rate', currentSampleRate.toString());
      recorder.setAttribute('data-mask-level', 'moderate');
      recorder.setAttribute('data-max-duration', '300000');
      recorder.onerror = function() {};
      document.head.appendChild(recorder);
    }, 3000);
  }

  // --- Google Analytics 4 ---
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  // Load GA4 script
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-1BRTT4J6ML';
  gaScript.onerror = function() {};
  gaScript.onload = function() {
    // --- Set consent for cookieless analytics ---
    gtag('consent', 'default', {
      ad_storage: 'denied',           // No ads cookies
      analytics_storage: 'granted'    // Allow GA4 in cookieless mode
    });

    // --- Initialize GA4 ---
    gtag('js', new Date());

    // Configure GA4 in cookieless mode
    gtag('config', 'G-1BRTT4J6ML', {
      allow_google_signals: false,    // No cross-device linking
      allow_ad_personalization_signals: false,
      cookie_update: false,
      cookie_domain: 'none'           // Cookieless mode
    });
  };

  document.head.appendChild(gaScript);

})();
