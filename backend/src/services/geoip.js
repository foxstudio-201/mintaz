import geoip from 'geoip-lite';

export function getGeoFromIP(ip) {
  if (!ip) {
    return { country: null, region: null, city: null };
  }

  const cleanIP = ip.replace(/^::ffff:/, '');

  if (cleanIP === '127.0.0.1' || cleanIP === '::1' || cleanIP.startsWith('192.168.') || cleanIP.startsWith('10.')) {
    return { country: 'Local', region: null, city: null };
  }

  try {
    const geo = geoip.lookup(cleanIP);
    if (!geo) {
      return { country: null, region: null, city: null };
    }

    return {
      country: geo.country || null,
      region: geo.region || null,
      city: geo.city || null,
    };
  } catch (error) {
    console.error('GeoIP lookup error:', error);
    return { country: null, region: null, city: null };
  }
}
