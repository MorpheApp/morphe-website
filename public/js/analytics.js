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
