// Minimal in-process FIFO job queue with limited concurrency. Keeps deploys
// serialized enough to avoid hammering Docker while still overlapping safely.
const CONCURRENCY = Number(process.env.DEPLOY_CONCURRENCY || 2);

const jobs = [];
let active = 0;

export function enqueue(taskFn, meta = {}) {
  jobs.push({ taskFn, meta });
  drain();
}

function drain() {
  while (active < CONCURRENCY && jobs.length) {
    const { taskFn } = jobs.shift();
    active++;
    Promise.resolve()
      .then(taskFn)
      .catch((err) => console.error('[queue] job failed:', err))
      .finally(() => {
        active--;
        drain();
      });
  }
}

export function queueStats() {
  return { active, pending: jobs.length };
}
