import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
  createHash,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import { config } from '../config.js';

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function verifyGithubSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected =
    'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function randomSecret(bytes = 24) {
  return randomBytes(bytes).toString('hex');
}

const ENC_PREFIX = 'enc:v1:';
const encKey = scryptSync(String(config.secretKey || ''), 'mintaz-secret-v1', 32);

export function encryptSecret(plain) {
  if (plain == null || plain === '') return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encKey, iv);
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptSecret(stored) {
  if (!stored || typeof stored !== 'string') return stored;
  if (!stored.startsWith(ENC_PREFIX)) return stored;
  const buf = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', encKey, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

export function hashIP(ip) {
  const salt = config.ipHashSalt || 'mintaz-default-salt';
  return createHash('sha256').update(ip + salt).digest('hex').slice(0, 16);
}
