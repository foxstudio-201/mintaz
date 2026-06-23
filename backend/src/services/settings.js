import { db } from '../db/index.js';
import { encryptSecret, decryptSecret } from '../util/crypto.js';

const UPSERT_SETTING = db.kind === 'mysql'
  ? 'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)'
  : 'INSERT INTO settings (`key`, value) VALUES (?, ?) ON CONFLICT(`key`) DO UPDATE SET value = excluded.value';

export async function getSetting(key, fallback = '') {
  const row = await db.prepare('SELECT value FROM settings WHERE `key` = ?').get(key);
  return row?.value ?? fallback;
}

export async function setSetting(key, value) {
  await db.prepare(UPSERT_SETTING).run(key, value == null ? null : String(value));
}

export async function getSecretSetting(key, fallback = '') {
  const row = await db.prepare('SELECT value FROM settings WHERE `key` = ?').get(key);
  if (row?.value == null || row.value === '') return fallback;
  return decryptSecret(row.value);
}

export async function setSecretSetting(key, value) {
  await setSetting(key, value ? encryptSecret(String(value)) : value);
}
