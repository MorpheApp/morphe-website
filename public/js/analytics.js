// analytics.js

(function() {
  // --- Umami ---
  (function() {
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://analytics.morphe.software/script.js';
    script.setAttribute('data-website-id', 'cd26cb28-0b3a-4524-be50-f7f69e46fcec');
    document.head.appendChild(script);
  })();

  // --- Google Analytics 4 ---
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }

  // Default consent: no cookies, no ads, no personalization
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied'
  });

  // Load GA4 script after consent is set
  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-1BRTT4J6ML';
  gaScript.onload = function() {
    // Initialize GA4
    gtag('js', new Date());

    // Configure GA4 in cookieless mode
    gtag('config', 'G-1BRTT4J6ML', {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_update: false,
      cookie_domain: 'none'
    });
  };
  document.head.appendChild(gaScript);
})();
