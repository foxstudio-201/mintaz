// `npm run db:init` — create schema and seed the admin user from .env.
import { db, migrate } from './index.js';
import { config } from '../config.js';
import { hashPassword } from '../util/crypto.js';
import { nanoid } from 'nanoid';

migrate();

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(config.adminEmail);
if (existing) {
  console.log(`[db:init] admin user already exists: ${config.adminEmail}`);
} else {
  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, created_at)
     VALUES (?, ?, ?, 'admin', ?)`
  ).run(nanoid(), config.adminEmail, hashPassword(config.adminPassword), Date.now());
  console.log(`[db:init] seeded admin user: ${config.adminEmail}`);
}

console.log(`[db:init] database ready at ${config.dbPath}`);
process.exit(0);
