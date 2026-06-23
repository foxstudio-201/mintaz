// Parse env files from a checked-out repo and import missing keys into a project.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import { db } from '../db/index.js';

// Files scanned, in priority order. `.env.example` is the canonical source of
// "what variables this app needs"; `.env` (rarely committed) is a fallback.
const CANDIDATES = ['.env.example', '.env.sample', '.env.template', '.env'];

function parseEnv(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  }
  return out;
}

// Read & merge env candidate files from the checkout dir.
export function scanRepoEnv(dir) {
  const merged = {};
  for (const name of CANDIDATES) {
    const p = join(dir, name);
    if (!existsSync(p)) continue;
    try {
      const vars = parseEnv(readFileSync(p, 'utf8'));
      for (const [k, v] of Object.entries(vars)) {
        if (!(k in merged)) merged[k] = { value: v, source: name };
      }
    } catch {
      /* ignore unreadable file */
    }
  }
  return merged;
}

// Import variables found in the repo that the project doesn't already define.
// Never overwrites existing values (user-set vars win). Returns imported keys.
export function importRepoEnv(projectId, dir, onLine) {
  const found = scanRepoEnv(dir);
  const keys = Object.keys(found);
  if (!keys.length) return [];

  const existing = new Set(
    db.prepare('SELECT key FROM env_vars WHERE project_id = ?').all(projectId).map((r) => r.key)
  );
  const ins = db.prepare(
    'INSERT OR IGNORE INTO env_vars (id, project_id, scope, key, value) VALUES (?, ?, ?, ?, ?)'
  );
  const imported = [];
  for (const k of keys) {
    if (existing.has(k)) continue;
    // Placeholder-only values (e.g. "your-key-here", "") are imported as blanks
    // so they show up in the editor for the user to fill in.
    const val = found[k].value;
    ins.run(nanoid(), projectId, 'all', k, val);
    imported.push(k);
  }
  if (imported.length) {
    onLine?.(`▶ Imported ${imported.length} env var(s) from repo: ${imported.join(', ')}`);
  }
  return imported;
}
