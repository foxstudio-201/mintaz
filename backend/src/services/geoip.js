/**
 * GeoIP Lookup Service
 * Get country/region/city from IP address
 */
import geoip from 'geoip-lite';

/**
 * Get geographic info from IP address
 * @param {string} ip - IP address
 * @returns {Object} Geo info: { country, region, city }
 */
export function getGeoFromIP(ip) {
  if (!ip) {
    return { country: null, region: null, city: null };
  }

  // Remove IPv6 prefix from IPv4
  const cleanIP = ip.replace(/^::ffff:/, '');

  // Skip private/local IPs
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
