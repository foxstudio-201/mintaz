import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

mkdirSync(dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function migrate() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);
  const quotasSchema = readFileSync(join(__dirname, 'quotas.sql'), 'utf8');
  db.exec(quotasSchema);
  ensureColumns();
}

function ensureColumns() {
  const additions = {
    users: [
      ['name', 'TEXT'],
      ['github_login', 'TEXT'],
      ['github_token', 'TEXT'],
      ['github_avatar', 'TEXT'],
      ['cf_token', 'TEXT'],
      ['cf_account', 'TEXT'],
    ],
    page_views: [
      ['language', 'TEXT'],
    ],
    projects: [
      ["framework", "TEXT NOT NULL DEFAULT 'auto'"],
      ['output_dir', 'TEXT'],
      ['git_token', 'TEXT'],
      ['public_slug', 'TEXT'],
      ['cf_zone_id', 'TEXT'],
      ['cf_zone_name', 'TEXT'],
      ['cf_record_id', 'TEXT'],
      ['cf_tunnel_cname', 'TEXT'],
    ],
  };
  for (const [table, cols] of Object.entries(additions)) {
    const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
    for (const [name, def] of cols) {
      if (!existing.has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
    }
  }
  backfillPublicSlugs();
}

function backfillPublicSlugs() {
  const rows = db.prepare(`SELECT id, slug FROM projects WHERE public_slug IS NULL OR public_slug = ''`).all();
  if (!rows.length) return;
  const rnd = () => {
    const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  };
  const upd = db.prepare('UPDATE projects SET public_slug = ? WHERE id = ?');
  for (const r of rows) upd.run(`${r.slug.slice(0, 18)}-${rnd()}`, r.id);
}

migrate();

export default db;
