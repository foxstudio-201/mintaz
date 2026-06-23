<div align="center">

<img src="assets/mintaz-logo.svg" alt="Mintaz" width="96" height="96" />

# Mintaz

**A self-hosted Platform-as-a-Service on a single Linux box.**

Push to Git → get a live container behind a wildcard domain, with per-branch / per-PR
previews, live build & runtime logs, and automatic reverse-proxy routing.

[![GitHub](https://img.shields.io/badge/GitHub-foxstudio--201%2Fmintaz-181717?logo=github&logoColor=white)](https://github.com/foxstudio-201/mintaz)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-required-2496ED?logo=docker&logoColor=white)
![Fastify](https://img.shields.io/badge/API-Fastify-000000?logo=fastify&logoColor=white)
![React](https://img.shields.io/badge/UI-React%20%2B%20Tailwind-06B6D4?logo=react&logoColor=white)

</div>

> [!IMPORTANT]
> This is a real working system, not a demo. It builds and runs **real Docker containers**,
> wires them into a **real reverse proxy** (Caddy or Nginx), and exposes them through a
> **real Cloudflare Tunnel** — no open ports.

---

## ✨ Features

| | |
|---|---|
| 🚀 **Git deployments** | Clone any GitHub repo (HTTPS/SSH), build, and run in one click. |
| 🔗 **Connect GitHub (OAuth)** | Log in with GitHub and import any repo from a searchable list. Private repos clone automatically. ([setup](docs/GITHUB-OAUTH.md)) |
| 🧩 **Framework presets** | Next.js, Nuxt, SvelteKit, Remix, NestJS, Vite, CRA, Vue, Angular, Astro, static, or auto-detect — the right Dockerfile is generated. |
| 📦 **Isolated containers** | Every deployment is its own image + container with resource caps and network isolation. |
| 🌿 **Preview environments** | Every branch and every Pull Request gets its own container + subdomain; PR previews auto-destroy on close. |
| 🪝 **Webhook auto-deploy** | Signature-verified `push` / `pull_request` events trigger the pipeline automatically. |
| 🔀 **Automatic routing** | Proxy config is generated from the database and hot-reloaded on every deploy. Wildcard subdomains. |
| ☁️ **Cloudflare Tunnel** | A single named tunnel exposes the dashboard and all apps — zero open ports. |
| 📊 **Live dashboard** | React + Tailwind + Framer Motion glassmorphism UI: real-time WebSocket logs, env editor, deployment timeline, analytics, light/dark + mobile. |

## 🌐 Domains

| Pattern | Serves |
|---|---|
| `dash.your-domain.com` | Dashboard UI + REST / WebSocket API |
| `your-domain.com` | Base / landing |
| `<app>.your-domain.com` | A deployed production app |
| `<branch>-<app>.your-domain.com` | A branch preview |
| `pr-<n>-<app>.your-domain.com` | A Pull-Request preview |

## 🏗️ Architecture

```text
GitHub ──webhook──▶ Fastify API ──▶ Deploy queue
                        │                │
                        │                ├─ git clone / checkout     (services/git.js)
                        │                ├─ docker build + run        (services/docker.js)
                        │                ├─ write proxy config        (services/proxy.js)
                        │                └─ stream logs ──▶ SQLite + WebSocket
                        │
   Browser ◀── dash.your-domain.com ──┘   (static UI served by the API)

Cloudflare Tunnel ──▶ Proxy :8088 ──host-routing──▶ 127.0.0.1:<container host port>
```

Everything runs on **one box**. The API serves both the JSON API and the built dashboard.
The proxy does host-based routing to per-container host ports. `cloudflared` brings traffic in.

**Stack:** Fastify · better-sqlite3 · Docker CLI · Caddy/Nginx · cloudflared · React · Vite · Tailwind.

## ⚡ Quick install

```bash
git clone https://github.com/foxstudio-201/mintaz.git
cd mintaz
sudo ./setup.sh
```

The interactive installer will:

1. Detect your OS (Debian/Ubuntu, RHEL/Fedora, Arch).
2. Install Docker, Node.js 20, PM2, Caddy (or Nginx), and cloudflared.
3. Ask for admin email/password, base domain, proxy choice, webhook secret, and Cloudflare Tunnel token.
4. Generate `.env` with **strong random secrets**, init the SQLite schema, seed the admin, build the frontend.
5. Install and start the `mintaz-api` systemd service.
6. Generate the proxy + cloudflared configs and start them.
7. Print your final URLs.

See [`docs/INSTALL.md`](docs/INSTALL.md) for the manual path and
[`docs/WEBHOOK.md`](docs/WEBHOOK.md) for wiring up GitHub.

## 🔒 Security

Built to be exposed to the public internet:

- **Passwords** hashed with `scrypt` + per-user salt and timing-safe comparison.
- **Tokens encrypted at rest** — Cloudflare / GitHub tokens are AES-256-GCM encrypted in the DB.
- **Auth** via JWT; every resource route enforces ownership (no cross-tenant access).
- **Rate limiting** on login & registration to blunt brute-force / signup spam.
- **Container isolation** — per-container memory / CPU / PID caps, `no-new-privileges`, and
  inter-container traffic disabled on the shared bridge.
- **Admin controls** — toggle public registration at runtime; suspend / manage users.
- **Fail-fast** — the server refuses to start with placeholder secrets.

## 💻 Local development

```bash
# backend
cd backend
cp .env.example .env          # then set strong secrets (see note below)
npm install
npm run db:init
npm run dev                   # http://localhost:8080

# frontend (separate terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (proxies /api + /ws → :8080)
```

> [!NOTE]
> The server refuses to boot with the shipped placeholder secrets. For local dev, either
> set strong values in `.env` (`openssl rand -hex 32`) **or** export `ALLOW_INSECURE_DEFAULTS=1`.
> The admin account is seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` by `npm run db:init`.

## ⚙️ Configuration

Key `.env` settings (full list in [`backend/.env.example`](backend/.env.example)):

| Variable | Purpose |
|---|---|
| `BASE_DOMAIN` | Apps deploy under `*.BASE_DOMAIN`. |
| `JWT_SECRET` / `SECRET_KEY` | Token signing & at-rest encryption (required, no defaults). |
| `ALLOW_REGISTRATION` | Allow public sign-up (also toggle-able from the admin UI). |
| `CONTAINER_MEMORY` / `CONTAINER_CPUS` | Per-deployment resource caps. |
| `PROXY` | `caddy` or `nginx`. |
| `CF_TUNNEL_NAME` | Cloudflare Tunnel name. |

## ✅ Requirements

- Linux server (root / sudo)
- Docker Engine
- A domain on Cloudflare with a wildcard record pointed at your tunnel
- A GitHub repo to deploy

## 📄 License

Released under the [MIT License](LICENSE).
