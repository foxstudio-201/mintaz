import { existsSync, writeFileSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config.js';

const FLAG = join(config.dataDir, 'maintenance.flag');

export function isMaintenance() {
  return existsSync(FLAG);
}

export function maintenanceInfo() {
  if (!existsSync(FLAG)) return null;
  try {
    return JSON.parse(readFileSync(FLAG, 'utf8'));
  } catch {
    return { reason: 'manual' };
  }
}

export function setMaintenance(on, reason = 'manual') {
  if (on) {
    mkdirSync(config.dataDir, { recursive: true });
    writeFileSync(FLAG, JSON.stringify({ reason, since: Date.now() }));
  } else {
    try { rmSync(FLAG); } catch { /* already off */ }
  }
}

export function maintenancePage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mintaz — Maintenance</title>
<style>
  body{margin:0;height:100vh;display:grid;place-items:center;font-family:Inter,system-ui,sans-serif;
    background:#070a12;color:#e2e8f0;background-image:radial-gradient(800px circle at 50% 0%,rgba(16,185,129,.10),transparent 45%)}
  .box{text-align:center;max-width:420px;padding:2rem}
  .leaf{width:64px;height:64px;margin:0 auto 1.25rem}
  h1{font-size:1.5rem;margin:.25rem 0}
  p{color:#94a3b8;line-height:1.6}
  .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:6px;animation:pulse 1.4s infinite}
  @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
  button{margin-top:1.5rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#cbd5e1;
    padding:.55rem 1rem;border-radius:.6rem;font-size:.85rem;cursor:pointer;display:none}
  button:hover{filter:brightness(1.3)}
</style></head><body>
<div class="box">
  <svg class="leaf" viewBox="0 0 32 32" fill="none">
    <path d="M7 27C5 19 10 9 24 4c2 9-4 19-14 21-1.5.3-2.5-.5-3-2Z" fill="#34d399" opacity=".3"/>
    <path d="M7 27C5 19 10 9 24 4c2 9-4 19-14 21-1.5.3-2.5-.5-3-2Z" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <h1>Mintaz</h1>
  <p><span class="dot"></span>We're performing maintenance. The dashboard will be back shortly.</p>
  <button id="off">Disable maintenance (admin)</button>
</div>
<script>
  var t = localStorage.getItem('mintaz.token');
  var b = document.getElementById('off');
  if (t) { b.style.display='inline-block'; b.onclick=function(){
    b.disabled=true;b.textContent='Disabling…';
    fetch('/api/admin/maintenance',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+t},body:JSON.stringify({on:false})})
      .then(function(r){ if(r.ok){location.reload()} else {b.disabled=false;b.textContent='Not authorized'} })
      .catch(function(){b.disabled=false;b.textContent='Failed — retry'});
  }; }
  setTimeout(function(){location.reload()}, 15000);
</script></body></html>`;
}
