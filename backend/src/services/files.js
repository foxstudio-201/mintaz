import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve, relative, sep } from 'node:path';
import { checkoutDir } from './git.js';

const IGNORE = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache']);
const MAX_FILE_BYTES = 512 * 1024;

function safeResolve(deploymentId, relPath = '') {
  const root = checkoutDir(deploymentId);
  const target = resolve(root, '.' + sep + (relPath || ''));
  const rel = relative(root, target);
  if (rel.startsWith('..') || resolve(root, rel) !== target) {
    throw Object.assign(new Error('path escapes deployment root'), { code: 'ETRAVERSE' });
  }
  return { root, target };
}

export async function listDir(deploymentId, relPath = '') {
  const { root, target } = safeResolve(deploymentId, relPath);
  let dirents;
  try {
    dirents = await readdir(target, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') throw Object.assign(new Error('source not available (deployment cleaned up)'), { code: 'ENOENT' });
    throw err;
  }
  const entries = [];
  for (const d of dirents) {
    if (relPath === '' && IGNORE.has(d.name)) continue;
    if (d.name === '.git' || d.name === 'node_modules') continue;
    let size = 0;
    if (d.isFile()) {
      try {
        size = (await stat(join(target, d.name))).size;
      } catch {
      }
    }
    entries.push({ name: d.name, type: d.isDirectory() ? 'dir' : 'file', size });
  }
  entries.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1));
  return { path: relative(root, target).split(sep).join('/'), entries };
}

export async function readFileSafe(deploymentId, relPath) {
  const { root, target } = safeResolve(deploymentId, relPath);
  const st = await stat(target).catch(() => null);
  if (!st || !st.isFile()) throw Object.assign(new Error('not a file'), { code: 'ENOFILE' });
  if (st.size > MAX_FILE_BYTES) {
    return { path: relPath, size: st.size, truncated: true, binary: false, content: `// File too large to preview (${st.size} bytes).` };
  }
  const buf = await readFile(target);
  const slice = buf.subarray(0, 8192);
  const binary = slice.includes(0);
  if (binary) return { path: relPath, size: st.size, truncated: false, binary: true, content: null };
  return { path: relPath, size: st.size, truncated: false, binary: false, content: buf.toString('utf8') };
}
