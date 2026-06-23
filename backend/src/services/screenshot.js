import { existsSync, mkdirSync } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';
import puppeteer from 'puppeteer-core';
import { config } from '../config.js';

const SHOT_DIR = join(config.dataDir, 'screenshots');
const TTL_MS = 10 * 60 * 1000;
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
];

let chromePath;
let browserPromise = null;
const inflight = new Map();

function findChrome() {
  if (chromePath !== undefined) return chromePath;
  chromePath = CHROME_CANDIDATES.find((p) => p && existsSync(p)) || null;
  return chromePath;
}

export function screenshotAvailable() {
  return !!findChrome();
}

export function screenshotPath(deploymentId) {
  return join(SHOT_DIR, `${deploymentId}.png`);
}

async function getBrowser() {
  if (browserPromise) {
    const b = await browserPromise.catch(() => null);
    if (b && b.connected) return b;
    browserPromise = null;
  }
  const executablePath = findChrome();
  if (!executablePath) throw new Error('no chrome executable');
  browserPromise = puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });
  return browserPromise;
}

async function isFresh(path) {
  try {
    const s = await stat(path);
    return Date.now() - s.mtimeMs < TTL_MS;
  } catch {
    return false;
  }
}

async function capture(url, out) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    }
    await new Promise((r) => setTimeout(r, 600));
    await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: 1280, height: 800 } });
  } finally {
    await page.close().catch(() => {});
  }
}

export async function getScreenshot(deploymentId, url, force = false) {
  if (!findChrome()) return null;
  if (!existsSync(SHOT_DIR)) mkdirSync(SHOT_DIR, { recursive: true });
  const out = screenshotPath(deploymentId);
  if (!force && (await isFresh(out))) return out;
  if (inflight.has(deploymentId)) return inflight.get(deploymentId);
  const job = capture(url, out)
    .then(() => out)
    .catch(() => (existsSync(out) ? out : null))
    .finally(() => inflight.delete(deploymentId));
  inflight.set(deploymentId, job);
  return job;
}
