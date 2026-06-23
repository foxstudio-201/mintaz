import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackView } from '../lib/analytics';

export function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    trackView(location.pathname);
  }, [location.pathname]);
  return null;
}
