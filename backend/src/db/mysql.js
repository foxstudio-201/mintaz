import mysql from 'mysql2/promise';
import { config } from '../config.js';

const pool = mysql.createPool({
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.database,
  multipleStatements: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
});

function translate(sql) {
  return sql
    .replace(/INSERT\s+OR\s+IGNORE/gi, 'INSERT IGNORE')
    .replace(/INSERT\s+OR\s+REPLACE/gi, 'REPLACE');
}

function makePrepare(runner) {
  return function prepare(sql) {
    const q = translate(sql);
    return {
      async get(...params) {
        const [rows] = await runner.query(q, params);
        return rows[0];
      },
      async all(...params) {
        const [rows] = await runner.query(q, params);
        return rows;
      },
      async run(...params) {
        const [res] = await runner.query(q, params);
        return { changes: res.affectedRows, insertId: res.insertId };
      },
    };
  };
}

export const driver = {
  kind: 'mysql',
  prepare: makePrepare(pool),
  async exec(sql) {
    await pool.query(sql);
  },
  async columns(table) {
    const [rows] = await pool.query(
      'SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
      [config.mysql.database, table]
    );
    return rows.map((r) => r.name);
  },
  async tx(fn) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const q = { kind: 'mysql', prepare: makePrepare(conn) };
      const result = await fn(q);
      await conn.commit();
      return result;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  raw: pool,
};
