export function slugify(input, fallback = 'app') {
  const s = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || fallback;
}

export function dnsLabel(input, fallback = 'x') {
  return slugify(input, fallback).slice(0, 50);
}

import { randomBytes } from 'node:crypto';

export function randomSuffix(len = 5) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

export function makePublicSlug(name) {
  return `${slugify(name).slice(0, 18)}-${randomSuffix(5)}`;
}

export function subdomainFor({ slug, type, branch, prNumber }) {
  if (type === 'production') return slug;
  if (prNumber != null) return `pr-${prNumber}-${slug}`;
  return `${dnsLabel(branch)}-${slug}`;
}
