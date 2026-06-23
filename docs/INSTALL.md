# Install Guide

## 1. Automatic install (recommended)

```bash
git clone https://github.com/youruser/mintaz-deploy.git
cd mintaz-deploy
sudo ./setup.sh
```

The installer detects your distro (apt / dnf / yum / pacman), installs all
dependencies, runs an interactive wizard, builds the app, and starts the
`mintaz-api` systemd service plus the reverse proxy and Cloudflare Tunnel.

After it finishes:

```bash
systemctl status mintaz-api      # service health
journalctl -u mintaz-api -f      # live logs
```

Open `https://dash.<your-domain>` and log in with the admin credentials you set.

---

## 2. Cloudflare Tunnel

Mintaz uses **one** tunnel. The recommended path is a *remotely-managed* tunnel:

1. Cloudflare dashboard → **Zero Trust → Networks → Tunnels → Create a tunnel**.
2. Name it `mintaz-tunnel`, choose **Cloudflared / Linux**, copy the **token**.
3. Paste the token when `setup.sh` asks (or run `cloudflared service install <token>`).
4. Add **Public Hostnames** for the tunnel, all pointing at `http://localhost:80`:

   | Hostname              | Service                |
   |-----------------------|------------------------|
   | `dash.<domain>`       | `http://localhost:80`  |
   | `*.<domain>`          | `http://localhost:80`  |
   | `<domain>`            | `http://localhost:80`  |

Caddy (on `:80`) does the Host-based routing to the dashboard and to each
deployed container. Cloudflare terminates TLS at the edge, so no certificates
are needed on the box.

> DNS: the wildcard public hostname creates the needed `*.<domain>` CNAME to the
> tunnel automatically. If you manage DNS yourself, point `*.<domain>` and
> `dash.<domain>` (CNAME) at `<tunnel-id>.cfargotunnel.com`.

---

## 3. Manual install

```bash
# deps: docker, node>=18, git, caddy (or nginx), cloudflared
cd backend  && cp .env.example .env && $EDITOR .env
npm install && npm run db:init
cd ../frontend && npm install && npm run build

# run the API (serves the built UI + API)
cd ../backend && npm start          # http://localhost:8080
```

Then:

- Install `deploy/systemd/mintaz-api.service` (replace `__INSTALL_DIR__` /
  `__USER__`) into `/etc/systemd/system/` and `systemctl enable --now mintaz-api`.
- Render `deploy/caddy/Caddyfile.template` into `/etc/caddy/Caddyfile` and
  `systemctl reload caddy`.
- Install the cloudflared connector with your tunnel token.

---

## 4. Permissions note

The service runs as your user and is added to the `docker` group, with
`SupplementaryGroups=docker` in the unit. If deployments fail with a Docker
permission error right after install, the group membership hasn't applied to the
running service yet:

```bash
sudo systemctl restart mintaz-api
```

The proxy reload commands (`systemctl reload caddy`) run from the service; if
your user can't reload the proxy without a password, add a sudoers rule or set
`CADDY_RELOAD_CMD` accordingly in `backend/.env`.

---

## 5. Updating

```bash
cd mintaz && git pull
npm --prefix backend install
npm --prefix frontend install && npm --prefix frontend run build
sudo systemctl restart mintaz-api
```

## 6. PostgreSQL (optional)

SQLite is the default and needs nothing. To use Postgres, set in `backend/.env`:

```
DB_DRIVER=postgres
POSTGRES_URL=postgres://user:pass@localhost:5432/mintaz
```
