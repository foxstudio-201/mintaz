
const CONSENT = 'mintaz_consent';
const VID = 'mintaz_vid';
const ONE_YEAR = 365 * 24 * 60 * 60;

function setCookie(name: string, value: string, maxAge: number) {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax${secure}`;
}

function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

function delCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export type Consent = 'accepted' | 'rejected';

export function getConsent(): Consent | null {
  const c = getCookie(CONSENT);
  return c === 'accepted' || c === 'rejected' ? c : null;
}

export function setConsent(choice: Consent) {
  setCookie(CONSENT, choice, ONE_YEAR);
  if (choice === 'accepted') ensureVid();
  else delCookie(VID);
}

export function ensureVid(): string {
  let v = getCookie(VID);
  if (!v) {
    v = crypto.randomUUID();
    setCookie(VID, v, ONE_YEAR);
  }
  return v;
}

export function getVid(): string | null {
  return getCookie(VID);
}

export function analyticsAllowed(): boolean {
  return getConsent() === 'accepted';
}
