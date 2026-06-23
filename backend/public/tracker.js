/**
 * Mintaz Analytics Tracker
 * Lightweight page view tracking script (~2KB)
 * Injected automatically by edge proxy
 */
(function() {
  'use strict';

  // Get deployment ID from meta tag
  const meta = document.querySelector('meta[name="mintaz-id"]');
  if (!meta) return;

  const deploymentId = meta.content;
  const apiUrl = meta.getAttribute('data-api-url') || '';

  /**
   * Track a page view
   */
  function track() {
    const params = new URLSearchParams(window.location.search);

    const data = {
      deployment_id: deploymentId,
      path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      hostname: window.location.hostname,
      user_agent: navigator.userAgent,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      language: navigator.language,
      // UTM parameters
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    };

    // Use sendBeacon for non-blocking request (Blob needed for correct Content-Type)
    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(apiUrl + '/api/track', blob);
    } else {
      // Fallback to fetch
      fetch(apiUrl + '/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(function() {});
    }
  }

  /**
   * Track custom event
   */
  window.mintazTrack = function(eventName, eventData) {
    const data = {
      deployment_id: deploymentId,
      event_name: eventName,
      event_data: eventData ? JSON.stringify(eventData) : null,
      path: window.location.pathname,
    };

    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(apiUrl + '/api/track/event', blob);
    } else {
      fetch(apiUrl + '/api/track/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(function() {});
    }
  };

  // Track initial page view
  if (document.readyState === 'complete') {
    track();
  } else {
    window.addEventListener('load', track);
  }

  // Track SPA navigation (History API)
  let lastPath = window.location.pathname + window.location.search;

  function checkNavigation() {
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      track();
    }
  }

  // Listen for popstate (back/forward)
  window.addEventListener('popstate', checkNavigation);

  // Monkey-patch pushState and replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function() {
    originalPushState.apply(this, arguments);
    checkNavigation();
  };

  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    checkNavigation();
  };
})();
