// Slug + subdomain helpers. DNS labels: a-z, 0-9, hyphen, max 63 chars.
export function slugify(input, fallback = 'app') {
  const s = String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return s || fallback;
}

// A label safe to use as one DNS segment.
export function dnsLabel(input, fallback = 'x') {
  return slugify(input, fallback).slice(0, 50);
}

import { randomBytes } from 'node:crypto';

// A short random, DNS-safe token (lowercase letters + digits).
export function randomSuffix(len = 5) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// A stable, unique-ish public subdomain base for a project, e.g. "web-7f3a2".
// Random so projects never collide on the shared default domain.
export function makePublicSlug(name) {
  return `${slugify(name).slice(0, 18)}-${randomSuffix(5)}`;
}

// Compute the subdomain for a deployment target.
//   production:      <slug>
//   branch preview:  <branch>-<slug>
//   pr preview:      pr-<n>-<slug>
export function subdomainFor({ slug, type, branch, prNumber }) {
  if (type === 'production') return slug;
  if (prNumber != null) return `pr-${prNumber}-${slug}`;
  return `${dnsLabel(branch)}-${slug}`;
}
