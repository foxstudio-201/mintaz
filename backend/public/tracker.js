(function() {
  'use strict';

  const meta = document.querySelector('meta[name="mintaz-id"]');
  if (!meta) return;

  const deploymentId = meta.content;
  const apiUrl = meta.getAttribute('data-api-url') || '';

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
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
    };

    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      navigator.sendBeacon(apiUrl + '/api/track', blob);
    } else {
      fetch(apiUrl + '/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(function() {});
    }
  }

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

  if (document.readyState === 'complete') {
    track();
  } else {
    window.addEventListener('load', track);
  }

  let lastPath = window.location.pathname + window.location.search;

  function checkNavigation() {
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      track();
    }
  }

  window.addEventListener('popstate', checkNavigation);

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
