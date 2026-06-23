// WebSocket live log streaming: /ws/logs/:deploymentId?token=<jwt>&since=<id>
import { db } from '../db/index.js';
import { getLogs, subscribeLogs } from '../services/logs.js';

export default async function wsRoutes(fastify) {
  fastify.get('/logs/:deploymentId', { websocket: true }, (socket, request) => {
    const { deploymentId } = request.params;

    // Authenticate via query token (browsers can't set WS headers easily).
    const token = request.query.token;
    let userId;
    try {
      userId = fastify.jwt.verify(token).sub;
    } catch {
      socket.send(JSON.stringify({ type: 'error', error: 'unauthorized' }));
      socket.close();
      return;
    }

    // Authorize: deployment must belong to a project owned by the user.
    const dep = db.prepare('SELECT * FROM deployments WHERE id = ?').get(deploymentId);
    const proj = dep && db.prepare('SELECT user_id FROM projects WHERE id = ?').get(dep.project_id);
    if (!dep || !proj || proj.user_id !== userId) {
      socket.send(JSON.stringify({ type: 'error', error: 'not found' }));
      socket.close();
      return;
    }

    const send = (obj) => {
      if (socket.readyState === 1) socket.send(JSON.stringify(obj));
    };

    // Replay history.
    const since = Number(request.query.since) || 0;
    const history = getLogs(deploymentId, { sinceId: since });
    let lastId = since;
    for (const row of history) {
      send({ type: 'log', ...row });
      lastId = row.id;
    }
    send({ type: 'snapshot', status: dep.status });

    // Subscribe to live lines. The bus payload has no id, so re-read tail
    // periodically is avoided by just forwarding live lines as they arrive.
    const unsub = subscribeLogs(deploymentId, (entry) => {
      send({ type: 'log', stream: entry.stream, line: entry.line, ts: entry.ts });
    });

    // Push status changes by polling lightly (cheap single-row read).
    let lastStatus = dep.status;
    const statusTimer = setInterval(() => {
      const cur = db.prepare('SELECT status FROM deployments WHERE id = ?').get(deploymentId);
      if (cur && cur.status !== lastStatus) {
        lastStatus = cur.status;
        send({ type: 'status', status: cur.status });
      }
    }, 1500);

    socket.on('close', () => {
      unsub();
      clearInterval(statusTimer);
    });
    socket.on('error', () => {
      unsub();
      clearInterval(statusTimer);
    });
  });
}
