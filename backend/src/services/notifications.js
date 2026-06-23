import { nanoid } from 'nanoid';
import { db } from '../db/index.js';

export async function notify(userId, { type = 'info', title, body = null, link = null }) {
  if (!userId || !title) return;
  try {
    await db.prepare(
      'INSERT INTO notifications (id, user_id, type, title, body, link, seen, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
    ).run(nanoid(), userId, type, title, body, link, Date.now());
  } catch {
    return;
  }
}

export async function listNotifications(userId, limit = 30) {
  return db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').all(userId, limit);
}

export async function unreadCount(userId) {
  const r = await db.prepare('SELECT COUNT(*) c FROM notifications WHERE user_id = ? AND seen = 0').get(userId);
  return r.c;
}

export async function markAllRead(userId) {
  await db.prepare('UPDATE notifications SET seen = 1 WHERE user_id = ? AND seen = 0').run(userId);
}

export async function clearNotifications(userId) {
  await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
}
