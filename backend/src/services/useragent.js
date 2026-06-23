/**
 * User Agent Parser
 * Parse browser, OS, and device info from user agent string
 */
import { UAParser } from 'ua-parser-js';

const parser = new UAParser();

/**
 * Parse user agent string
 * @param {string} uaString - User agent string
 * @returns {Object} Parsed info: { device, browser, browserVersion, os, osVersion }
 */
export function parseUserAgent(uaString) {
  if (!uaString) {
    return {
      device: 'desktop',
      browser: 'Unknown',
      browserVersion: '',
      os: 'Unknown',
      osVersion: '',
    };
  }

  parser.setUA(uaString);
  const result = parser.getResult();

  // Determine device type
  let deviceType = 'desktop';
  if (result.device.type === 'mobile' || result.device.type === 'tablet') {
    deviceType = result.device.type;
  }

  return {
    device: deviceType,
    browser: result.browser.name || 'Unknown',
    browserVersion: result.browser.version || '',
    os: result.os.name || 'Unknown',
    osVersion: result.os.version || '',
  };
}

/**
 * Check if user agent is a bot
 * @param {string} uaString - User agent string
 * @returns {boolean}
 */
export function isBot(uaString) {
  if (!uaString) return false;
  const ua = uaString.toLowerCase();
  const botPatterns = [
    'bot', 'crawl', 'spider', 'slurp', 'feed', 'fetch',
    'google', 'bing', 'yahoo', 'duckduck', 'baidu', 'yandex',
    'facebook', 'twitter', 'linkedin', 'pinterest', 'embed',
    'curl', 'wget', 'python', 'java', 'node', 'axios',
  ];
  return botPatterns.some(pattern => ua.includes(pattern));
}
