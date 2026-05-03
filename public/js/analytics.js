(function() {
  (function() {
    const WEBSITE_ID = 'cd26cb28-0b3a-4524-be50-f7f69e46fcec';

    const analytics = document.createElement('script');
    analytics.defer = true;
    analytics.src = 'https://analytics.morphe.software/script.js';
    analytics.setAttribute('data-website-id', WEBSITE_ID);
    analytics.setAttribute('data-performance', 'true');
    document.head.appendChild(analytics);

    // Use a delay before starting anonymous session replay
    // to ignore users who immediately download
    setTimeout(() => {
      const RECORDER_EXCLUDED_PATHS = [
        'microg',
        'add-source',
      ];

      const pathname = window.location.pathname.toLowerCase();
      const isExcluded = RECORDER_EXCLUDED_PATHS.some(page => pathname.endsWith(page));

      if (!isExcluded) {
        const recorder = document.createElement('script');
        recorder.defer = true;
        recorder.src = 'https://analytics.morphe.software/recorder.js';
        recorder.setAttribute('data-website-id', WEBSITE_ID);
        recorder.setAttribute('data-sample-rate', '0.10');
        recorder.setAttribute('data-mask-level', 'moderate');
        recorder.setAttribute('data-max-duration', '300000');
        document.head.appendChild(recorder);
      }
    }, 2000);
  })();

  // --- Google Analytics 4 ---
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  // Load GA4 script
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-1BRTT4J6ML';
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

  // --- Track browser language for localization insights ---
  window.addEventListener('load', () => {
    if (window.umami) {
      umami.track('Browser', {
        language: navigator.language
      });
    }
  });
})();
