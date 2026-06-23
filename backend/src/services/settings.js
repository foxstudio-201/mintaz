import { db } from '../db/index.js';
import { encryptSecret, decryptSecret } from '../util/crypto.js';

export function getSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value ?? fallback;
}

export function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value == null ? null : String(value));
}

export function getSecretSetting(key, fallback = '') {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (row?.value == null || row.value === '') return fallback;
  return decryptSecret(row.value);
}

export function setSecretSetting(key, value) {
  setSetting(key, value ? encryptSecret(String(value)) : value);
}
