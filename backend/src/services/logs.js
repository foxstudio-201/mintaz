import { EventEmitter } from 'node:events';
import { db } from '../db/index.js';

const bus = new EventEmitter();
bus.setMaxListeners(0);

const insertStmt = db.prepare(
  `INSERT INTO logs (deployment_id, stream, line, ts) VALUES (?, ?, ?, ?)`
);

export function appendLog(deploymentId, line, stream = 'build') {
  const ts = Date.now();
  const text = String(line ?? '');
  insertStmt.run(deploymentId, stream, text, ts);
  bus.emit(deploymentId, { deploymentId, stream, line: text, ts });
}

export function logger(deploymentId, stream = 'build') {
  return (line) => appendLog(deploymentId, line, stream);
}

export function getLogs(deploymentId, { stream, sinceId = 0, limit = 2000 } = {}) {
  if (stream) {
    return db
      .prepare(
        `SELECT id, stream, line, ts FROM logs
         WHERE deployment_id = ? AND stream = ? AND id > ?
         ORDER BY id ASC LIMIT ?`
      )
      .all(deploymentId, stream, sinceId, limit);
  }
  return db
    .prepare(
      `SELECT id, stream, line, ts FROM logs
       WHERE deployment_id = ? AND id > ?
       ORDER BY id ASC LIMIT ?`
    )
    .all(deploymentId, sinceId, limit);
}

export function subscribeLogs(deploymentId, handler) {
  bus.on(deploymentId, handler);
  return () => bus.off(deploymentId, handler);
}
