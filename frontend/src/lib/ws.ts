import { tokenStore } from './api';

export type LogMsg =
  | { type: 'log'; stream: string; line: string; ts: number; id?: number }
  | { type: 'status'; status: string }
  | { type: 'snapshot'; status: string }
  | { type: 'error'; error: string };

export function connectLogs(
  deploymentId: string,
  onMessage: (msg: LogMsg) => void,
  since = 0
): () => void {
  let closed = false;
  let ws: WebSocket | null = null;
  let retry = 0;

  const open = () => {
    if (closed) return;
    const token = tokenStore.get();
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws/logs/${deploymentId}?token=${token}&since=${since}`);

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as LogMsg;
        onMessage(msg);
      } catch {
      }
    };
    ws.onclose = () => {
      if (closed) return;
      retry = Math.min(retry + 1, 6);
      setTimeout(open, retry * 500);
    };
    ws.onerror = () => ws?.close();
  };

  open();
  return () => {
    closed = true;
    ws?.close();
  };
}
