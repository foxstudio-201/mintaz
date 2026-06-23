import { listNotifications, unreadCount, markAllRead, clearNotifications } from '../services/notifications.js';

export default async function notificationRoutes(fastify) {
  fastify.addHook('onRequest', fastify.authenticate);

  fastify.get('/', async (request) => {
    const userId = request.user.sub;
    return { notifications: await listNotifications(userId), unread: await unreadCount(userId) };
  });

  fastify.post('/read', async (request) => {
    await markAllRead(request.user.sub);
    return { ok: true };
  });

  fastify.delete('/', async (request) => {
    await clearNotifications(request.user.sub);
    return { ok: true };
  });
}
