import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const driver = config.dbDriver === 'mysql'
  ? (await import('./mysql.js')).driver
  : (await import('./sqlite.js')).driver;

export const db = driver;

function read(name) {
  return readFileSync(join(__dirname, name), 'utf8');
}

export async function migrate() {
  if (driver.kind === 'mysql') {
    await driver.exec(read('schema.mysql.sql'));
    await driver.exec(read('quotas.mysql.sql'));
  } else {
    await driver.exec(read('schema.sql'));
    await driver.exec(read('quotas.sql'));
  }
  await ensureColumns();
  await backfillPublicSlugs();
}

async function ensureColumns() {
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
    dashboard_views: [
      ['ip_hash', 'TEXT'],
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
    const existing = new Set(await driver.columns(table));
    for (const [name, def] of cols) {
      if (!existing.has(name)) await driver.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
    }
  }
}

async function backfillPublicSlugs() {
  const rows = await db.prepare(`SELECT id, slug FROM projects WHERE public_slug IS NULL OR public_slug = ''`).all();
  if (!rows.length) return;
  const rnd = () => {
    const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let s = '';
    for (let i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  };
  const upd = db.prepare('UPDATE projects SET public_slug = ? WHERE id = ?');
  for (const r of rows) await upd.run(`${r.slug.slice(0, 18)}-${rnd()}`, r.id);
}

await migrate();

export default db;
