# Mintaz Deploy

A self-hosted Platform-as-a-Service — a simplified **Vercel + Coolify** you run on a single
Linux server. Push to Git, get a live container behind a wildcard domain, with preview
deployments per branch / PR, live build & runtime logs, and automatic reverse-proxy routing.

> ⚠️ This is a real working system, not a demo. It builds and runs **real Docker containers**,
> wires them into a **real Caddy reverse proxy**, and exposes them through a **real Cloudflare
> Tunnel**.

---

## Features

- **Git-based deployments** — clone any GitHub repo (HTTPS or SSH), build, run.
- **Connect GitHub (OAuth)** — log in with GitHub and import any repo from a
  searchable list, Vercel-style ([setup](docs/GITHUB-OAUTH.md)). Private repos
  clone automatically with the connected account's token.
- **Framework presets** — Next.js, Nuxt, SvelteKit, Remix, NestJS, Vite, CRA,
  Vue, Angular, Astro, static, or auto-detect; the right Dockerfile is generated.
- **Docker isolation per project** — every deployment is its own image + container, isolated
  filesystem / env / network. Auto-detects a `Dockerfile`, or generates a Node one.
- **Preview deployments** — every branch and every Pull Request gets its own container and
  subdomain; PR previews are auto-destroyed on close.
- **GitHub webhook auto-deploy** — signature-verified `push` and `pull_request` events trigger
  the pipeline automatically.
- **Automatic reverse proxy** — Caddy config is generated from the database and hot-reloaded on
  every deploy. Wildcard subdomain routing.
- **Cloudflare Tunnel** — single named tunnel exposes the dashboard and all apps with no open
  ports.
- **SaaS dashboard** — React + Tailwind + Framer Motion, dark glassmorphism UI, live WebSocket
  logs, env editor, deployment timeline.

## Domains

| Domain                     | Serves                                   |
|----------------------------|------------------------------------------|
| `dash.your-domain.com`        | Dashboard UI + REST/WS API               |
| `your-domain.com`             | Base / landing                           |
| `<app>.your-domain.com`       | A deployed production app                |
| `<branch>-<app>.your-domain.com` | A branch preview                      |
| `pr-<n>-<app>.your-domain.com`   | A Pull-Request preview                 |

## Architecture

```
GitHub ──webhook──▶ Fastify API ──▶ Deploy queue
                        │                │
                        │                ├─ git clone/checkout      (services/git.js)
                        │                ├─ docker build + run      (services/docker.js)
                        │                ├─ write Caddy config      (services/proxy.js)
                        │                └─ stream logs ──▶ SQLite + WebSocket
                        │
   Browser ◀── dash.your-domain.com ──┘   (static UI served by the API)

Cloudflare Tunnel ──▶ Caddy :80 ──host-routing──▶ 127.0.0.1:<container host port>
```

Everything runs on one box. The API serves both the JSON API and the built dashboard. Caddy
does host-based routing to per-container host ports. cloudflared brings traffic in.

## Quick install

```bash
git clone https://github.com/youruser/mintaz.git
cd mintaz
sudo ./setup.sh
```

The interactive installer will:

1. Detect your OS (Debian/Ubuntu, RHEL/Fedora, Arch).
2. Install Docker, Node.js 20, PM2, Caddy (or Nginx), and cloudflared.
3. Ask for: admin email/password, base domain, proxy choice, GitHub webhook secret, and
   Cloudflare Tunnel token.
4. Generate `.env`, initialize the SQLite schema, seed the admin user, build the frontend.
5. Install and start the `mintaz-api` systemd service.
6. Generate the Caddy + cloudflared configs and start them.
7. Print your final URLs.

See [`docs/INSTALL.md`](docs/INSTALL.md) for the manual / step-by-step path and
[`docs/WEBHOOK.md`](docs/WEBHOOK.md) for wiring up GitHub.

## Local development

```bash
# backend
cd backend
cp .env.example .env
npm install
npm run db:init
npm run dev          # http://localhost:8080

# frontend (separate terminal)
cd frontend
npm install
npm run dev          # http://localhost:5173 (proxies /api + /ws to :8080)
```

Default admin (dev): `admin@your-domain.com` / `changeme` — set in `.env` (`ADMIN_EMAIL`,
`ADMIN_PASSWORD`), seeded by `npm run db:init`.

## Requirements

- Linux server (root / sudo).
- Docker Engine.
- A domain on Cloudflare with a wildcard record pointed at your tunnel.
- A GitHub repo to deploy.

## License

MIT.
