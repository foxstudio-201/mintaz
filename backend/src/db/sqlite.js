import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from '../config.js';

mkdirSync(dirname(config.dbPath), { recursive: true });

const sqlite = new Database(config.dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

function makePrepare(conn) {
  return function prepare(sql) {
    const s = conn.prepare(sql);
    return {
      async get(...params) {
        return s.get(...params);
      },
      async all(...params) {
        return s.all(...params);
      },
      async run(...params) {
        const r = s.run(...params);
        return { changes: r.changes, insertId: r.lastInsertRowid };
      },
    };
  };
}

export const driver = {
  kind: 'sqlite',
  prepare: makePrepare(sqlite),
  async exec(sql) {
    sqlite.exec(sql);
  },
  async columns(table) {
    return sqlite.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  },
  async tx(fn) {
    sqlite.exec('BEGIN');
    try {
      const result = await fn(driver);
      sqlite.exec('COMMIT');
      return result;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  },
  raw: sqlite,
};
