import { analyticsAllowed, getVid } from './consent';

export function trackView(path: string) {
  if (!analyticsAllowed()) return;
  const body = JSON.stringify({
    path,
    visitor: getVid(),
    referrer: document.referrer || null,
    user_agent: navigator.userAgent,
    language: navigator.language,
  });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track/app', new Blob([body], { type: 'application/json' }));
    } else {
      fetch('/api/track/app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
  }
}
