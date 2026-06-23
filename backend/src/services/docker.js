import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { run, stream } from '../util/sh.js';
import { config } from '../config.js';
import { db } from '../db/index.js';

const DOCKER = config.dockerBin;
const NETWORK = 'mintaz';

export async function dockerAvailable() {
  try {
    await run(DOCKER, ['info', '--format', '{{.ServerVersion}}']);
    return true;
  } catch {
    return false;
  }
}

export async function ensureNetwork() {
  try {
    const { stdout } = await run(DOCKER, [
      'network', 'inspect', NETWORK,
      '-f', '{{index .Options "com.docker.network.bridge.enable_icc"}}',
    ]);
    if (config.disableInterContainer && stdout.trim() !== 'false') {
      console.warn(
        `[docker] network "${NETWORK}" still allows inter-container traffic. ` +
        `To isolate tenants, stop containers and run: docker network rm ${NETWORK} ` +
        `(it will be recreated with ICC disabled).`
      );
    }
  } catch {
    const args = ['network', 'create'];
    if (config.disableInterContainer) args.push('--opt', 'com.docker.network.bridge.enable_icc=false');
    args.push(NETWORK);
    await run(DOCKER, args).catch(() => {});
  }
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}

export async function allocateHostPort() {
  const used = new Set(
    db
      .prepare(`SELECT host_port FROM deployments WHERE host_port IS NOT NULL`)
      .all()
      .map((r) => r.host_port)
  );
  for (let p = config.portRangeStart; p <= config.portRangeEnd; p++) {
    if (used.has(p)) continue;
    if (await portIsFree(p)) return p;
  }
  throw new Error('no free host ports in configured range');
}

export async function buildImage({ contextDir, dockerfile, tag, onLine }) {
  onLine?.(`$ docker build -t ${tag} -f ${dockerfile} .`);
  const args = ['build', '--pull'];
  if (config.buildMemory) args.push('--memory', config.buildMemory);
  args.push('-t', tag, '-f', dockerfile, '.');
  const code = await stream(DOCKER, args, { cwd: contextDir, onLine });
  if (code !== 0) throw new Error(`docker build failed (exit ${code})`);
  return tag;
}

export async function runContainer({
  tag,
  name,
  hostPort,
  internalPort,
  env = {},
  restartPolicy = config.defaultRestartPolicy,
  labels = {},
  onLine,
}) {
  await removeContainer(name).catch(() => {});

  const args = ['run', '-d', '--name', name, '--network', NETWORK];
  args.push('--restart', restartPolicy);

  const c = config.container;
  args.push('--memory', c.memory, '--memory-swap', c.memory);
  args.push('--cpus', String(c.cpus));
  args.push('--pids-limit', String(c.pidsLimit));
  args.push('--ulimit', `nofile=${c.nofile}:${c.nofile}`);

  args.push('--security-opt', 'no-new-privileges');
  if (c.dropCaps) {
    args.push('--cap-drop', 'ALL');
    for (const cap of ['NET_BIND_SERVICE', 'CHOWN', 'SETUID', 'SETGID', 'DAC_OVERRIDE']) {
      args.push('--cap-add', cap);
    }
  }

  args.push('-p', `127.0.0.1:${hostPort}:${internalPort}`);
  args.push('-e', `PORT=${internalPort}`);
  for (const [k, v] of Object.entries(env)) {
    if (k === 'PORT') continue;
    args.push('-e', `${k}=${v}`);
  }
  for (const [k, v] of Object.entries(labels)) args.push('--label', `${k}=${v}`);
  args.push(tag);

  onLine?.(`$ docker run -d --name ${name} -p 127.0.0.1:${hostPort}:${internalPort} ${tag}`);
  const { stdout } = await run(DOCKER, args);
  return stdout.trim();
}

export async function stopContainer(nameOrId) {
  await run(DOCKER, ['stop', nameOrId]).catch(() => {});
}

export async function removeContainer(nameOrId) {
  await run(DOCKER, ['rm', '-f', nameOrId]).catch(() => {});
}

export async function removeImage(tag) {
  await run(DOCKER, ['rmi', '-f', tag]).catch(() => {});
}

export function followLogs(nameOrId, onLine, tail = 200) {
  const child = spawn(DOCKER, ['logs', '-f', '--tail', String(tail), nameOrId]);
  const pump = (chunk) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.length) onLine?.(line);
    }
  };
  child.stdout?.on('data', pump);
  child.stderr?.on('data', pump);
  child.on('error', () => {});
  return child;
}

export async function isRunning(nameOrId) {
  try {
    const { stdout } = await run(DOCKER, ['inspect', '-f', '{{.State.Running}}', nameOrId]);
    return stdout.trim() === 'true';
  } catch {
    return false;
  }
}
