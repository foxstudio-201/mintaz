import { rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run, stream } from '../util/sh.js';
import { config } from '../config.js';

const gitEnv = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

export function checkoutDir(deploymentId) {
  return join(config.workDir, 'builds', deploymentId);
}

export function authUrl(repoUrl, token) {
  if (!token) return repoUrl;
  if (!/^https?:\/\//i.test(repoUrl)) return repoUrl;
  const clean = repoUrl.replace(/\/\/[^@/]+@/, '//');
  return clean.replace(/^(https?:\/\/)/i, `$1x-access-token:${token}@`);
}

export async function cloneRepo({ repoUrl, branch, deploymentId, token, onLine }) {
  const dir = checkoutDir(deploymentId);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const url = authUrl(repoUrl, token);
  onLine?.(`$ git clone --depth 1 --branch ${branch} ${redact(repoUrl)}`);
  await stream(
    'git',
    ['clone', '--depth', '1', '--branch', branch, '--single-branch', url, dir],
    { onLine: (l) => onLine?.(redact(l)), env: gitEnv }
  );

  if (!existsSync(join(dir, '.git'))) {
    throw new Error(
      'git clone failed — check the repository URL, branch, and (for private repos) the access token'
    );
  }

  const sha = (await run('git', ['-C', dir, 'rev-parse', 'HEAD'], { env: gitEnv })).stdout.trim();
  let msg = '';
  try {
    msg = (await run('git', ['-C', dir, 'log', '-1', '--pretty=%s'], { env: gitEnv })).stdout.trim();
  } catch {
  }
  return { dir, sha, message: msg };
}

export async function cleanupCheckout(deploymentId) {
  await rm(checkoutDir(deploymentId), { recursive: true, force: true });
}

function redact(text) {
  return String(text).replace(/\/\/[^@/\s]+@/g, '//***@');
}
