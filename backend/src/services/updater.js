import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run, stream } from '../util/sh.js';
import { config } from '../config.js';
import { setMaintenance } from './maintenance.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..', '..');

async function localCommit() {
  try {
    const { stdout } = await run('git', ['rev-parse', 'HEAD'], { cwd: ROOT });
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function checkUpdate() {
  const { owner, name, branch } = config.repo;
  const current = await localCommit();
  const base = { version: config.appVersion, branch, current: current ? current.slice(0, 7) : null, currentFull: current };
  const headers = { 'User-Agent': 'Mintaz', Accept: 'application/vnd.github+json' };

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${name}/commits/${branch}`, { headers });
    if (!res.ok) return { ...base, error: `GitHub API ${res.status}`, checkedAt: Date.now() };
    const latest = await res.json();
    const latestSha = latest.sha;
    const updateAvailable = Boolean(current && current !== latestSha);

    let behind = 0;
    let commits = [];
    if (updateAvailable) {
      const cmp = await fetch(`https://api.github.com/repos/${owner}/${name}/compare/${current}...${latestSha}`, { headers });
      if (cmp.ok) {
        const c = await cmp.json();
        behind = c.ahead_by || (c.commits ? c.commits.length : 0);
        commits = (c.commits || []).slice(-15).reverse().map((x) => ({
          sha: x.sha.slice(0, 7),
          message: (x.commit?.message || '').split('\n')[0],
          date: x.commit?.author?.date || null,
        }));
      }
    }

    return {
      ...base,
      latest: latestSha.slice(0, 7),
      latestMessage: (latest.commit?.message || '').split('\n')[0],
      latestDate: latest.commit?.author?.date || null,
      updateAvailable,
      behind,
      commits,
      checkedAt: Date.now(),
    };
  } catch (err) {
    return { ...base, error: err.message, checkedAt: Date.now() };
  }
}

let state = { running: false, done: false, ok: false, log: [], startedAt: 0 };

export function updateStatus() {
  return state;
}

export function startUpdate() {
  if (state.running) return state;
  state = { running: true, done: false, ok: false, log: [], startedAt: Date.now() };
  runUpdate();
  return state;
}

async function runUpdate() {
  const push = (line) => {
    state.log.push(String(line));
    if (state.log.length > 800) state.log.shift();
  };
  const { owner, name, branch } = config.repo;
  const url = `https://github.com/${owner}/${name}.git`;
  try {
    setMaintenance(true, 'update');
    push('▶ Maintenance mode ON');
    push(`▶ Fetching ${url} (${branch})`);
    if ((await stream('git', ['fetch', url, branch], { cwd: ROOT, onLine: push })) !== 0) throw new Error('git fetch failed');
    push('▶ Applying changes (git reset --hard FETCH_HEAD)');
    if ((await stream('git', ['reset', '--hard', 'FETCH_HEAD'], { cwd: ROOT, onLine: push })) !== 0) throw new Error('git reset failed');
    push('▶ Installing backend dependencies');
    if ((await stream('npm', ['install', '--no-audit', '--no-fund'], { cwd: join(ROOT, 'backend'), onLine: push })) !== 0) throw new Error('backend npm install failed');
    push('▶ Installing frontend dependencies');
    if ((await stream('npm', ['install', '--no-audit', '--no-fund'], { cwd: join(ROOT, 'frontend'), onLine: push })) !== 0) throw new Error('frontend npm install failed');
    push('▶ Building frontend');
    if ((await stream('npm', ['run', 'build'], { cwd: join(ROOT, 'frontend'), onLine: push })) !== 0) throw new Error('frontend build failed');

    state.ok = true;
    state.done = true;
    state.running = false;
    setMaintenance(false);
    if (process.env.INVOCATION_ID) {
      push('✅ Update applied. Restarting service…');
      setTimeout(() => process.exit(0), 1500);
    } else {
      push('✅ Update applied. Restart the service to load the new version.');
    }
  } catch (err) {
    push(`✖ Update failed: ${err.message}`);
    setMaintenance(false);
    state.ok = false;
    state.done = true;
    state.running = false;
  }
}

export { ROOT as _root };
export const APP_VERSION = config.appVersion;
