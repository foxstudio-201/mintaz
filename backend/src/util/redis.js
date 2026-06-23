import Redis from 'ioredis';
import { config } from '../config.js';

let client = null;
let warned = false;

if (config.redisUrl) {
  client = new Redis(config.redisUrl, { maxRetriesPerRequest: 2 });
  client.on('error', (err) => {
    if (!warned) {
      warned = true;
      console.warn('[redis] connection error:', err.message);
    }
  });
  client.on('ready', () => {
    warned = false;
    console.log('[redis] connected');
  });
}

export const redis = client;
export const hasRedis = Boolean(client);
