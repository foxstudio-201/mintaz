import { spawn } from 'node:child_process';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ code, stdout, stderr });
      else reject(Object.assign(new Error(`${cmd} exited ${code}: ${stderr || stdout}`), { code, stdout, stderr }));
    });
  });
}

export function stream(cmd, args, { onLine, ...opts } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts });
    let bufOut = '';
    let bufErr = '';
    const pump = (chunk, key) => {
      let buf = key === 'out' ? bufOut + chunk : bufErr + chunk;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) onLine?.(line);
      if (key === 'out') bufOut = buf;
      else bufErr = buf;
    };
    child.stdout?.on('data', (d) => pump(d.toString(), 'out'));
    child.stderr?.on('data', (d) => pump(d.toString(), 'err'));
    child.on('error', reject);
    child.on('close', (code) => {
      if (bufOut) onLine?.(bufOut);
      if (bufErr) onLine?.(bufErr);
      resolve(code);
    });
    return child;
  });
}
