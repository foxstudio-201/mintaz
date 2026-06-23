#!/usr/bin/env bash
set -euo pipefail

c_reset='\033[0m'; c_dim='\033[2m'; c_red='\033[31m'; c_grn='\033[32m'
c_ylw='\033[33m'; c_blu='\033[34m'; c_cyn='\033[36m'; c_bold='\033[1m'
log()  { echo -e "${c_cyn}▶${c_reset} $*"; }
ok()   { echo -e "${c_grn}✓${c_reset} $*"; }
warn() { echo -e "${c_ylw}!${c_reset} $*"; }
err()  { echo -e "${c_red}✖${c_reset} $*" >&2; }
die()  { err "$*"; exit 1; }
hr()   { echo -e "${c_dim}────────────────────────────────────────────────────────────${c_reset}"; }

banner() {
  echo -e "${c_blu}${c_bold}"
  cat <<'EOF'
  __  __ _       _              
 |  \/  (_)_ __ | |_ __ _ ____  
 | |\/| | | '_ \| __/ _` |_  /  
 | |  | | | | | | || (_| |/ /   
 |_|  |_|_|_| |_|\__\__,_/___|  
EOF
  echo -e "${c_reset}${c_dim}        Self-hosted PaaS — Git-driven deployments on your own box${c_reset}\n"
}

[ "$(id -u)" -eq 0 ] || die "Please run as root:  sudo ./setup.sh"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$SCRIPT_DIR"

RUN_USER="${SUDO_USER:-root}"
[ "$RUN_USER" = "root" ] && warn "Running service as root (no SUDO_USER detected)."

PKG=""; OS_NAME=""
detect_os() {
  if [ -f /etc/os-release ]; then . /etc/os-release; OS_NAME="$ID"; fi
  if command -v apt-get >/dev/null 2>&1; then PKG="apt"
  elif command -v dnf >/dev/null 2>&1; then PKG="dnf"
  elif command -v yum >/dev/null 2>&1; then PKG="yum"
  elif command -v pacman >/dev/null 2>&1; then PKG="pacman"
  else die "Unsupported distro: need apt, dnf, yum, or pacman."; fi
  ok "Detected OS: ${OS_NAME:-unknown} (package manager: $PKG)"
}

pkg_update() {
  case "$PKG" in
    apt) apt-get update -qq ;;
    dnf|yum) "$PKG" -y makecache >/dev/null 2>&1 || true ;;
    pacman) pacman -Sy --noconfirm >/dev/null 2>&1 || true ;;
  esac
}

pkg_install() {
  case "$PKG" in
    apt) DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" ;;
    dnf|yum) "$PKG" install -y "$@" ;;
    pacman) pacman -S --noconfirm --needed "$@" ;;
  esac
}

ensure_base() {
  log "Installing base utilities (curl, git, build tools)…"
  case "$PKG" in
    apt) pkg_install ca-certificates curl git gnupg lsb-release build-essential python3 ;;
    dnf|yum) pkg_install ca-certificates curl git gcc-c++ make python3 ;;
    pacman) pkg_install ca-certificates curl git base-devel python ;;
  esac
  ok "Base utilities ready."
}

ensure_docker() {
  if command -v docker >/dev/null 2>&1; then ok "Docker already installed ($(docker --version | awk '{print $3}' | tr -d ,)).";
  else
    log "Installing Docker Engine…"
    curl -fsSL https://get.docker.com | sh
    ok "Docker installed."
  fi
  systemctl enable --now docker >/dev/null 2>&1 || true
  if [ "$RUN_USER" != "root" ]; then
    usermod -aG docker "$RUN_USER" || true
    ok "Added $RUN_USER to the docker group."
  fi
}

ensure_node() {
  local need=20
  if command -v node >/dev/null 2>&1; then
    local major; major="$(node -v | sed 's/v\([0-9]*\).*/\1/')"
    if [ "$major" -ge 18 ]; then ok "Node.js already installed ($(node -v))."; return; fi
    warn "Node.js $(node -v) is too old; installing Node ${need}."
  else
    log "Installing Node.js ${need}…"
  fi
  case "$PKG" in
    apt) curl -fsSL https://deb.nodesource.com/setup_${need}.x | bash - >/dev/null 2>&1; pkg_install nodejs ;;
    dnf|yum) curl -fsSL https://rpm.nodesource.com/setup_${need}.x | bash - >/dev/null 2>&1; pkg_install nodejs ;;
    pacman) pkg_install nodejs npm ;;
  esac
  ok "Node.js installed ($(node -v))."
}

ensure_pm2() {
  if command -v pm2 >/dev/null 2>&1; then ok "PM2 already installed.";
  else log "Installing PM2 (process manager, optional)…"; npm install -g pm2 >/dev/null 2>&1 || warn "PM2 install failed (systemd will be used instead)."; ok "PM2 ready."; fi
}

ensure_caddy() {
  if command -v caddy >/dev/null 2>&1; then ok "Caddy already installed."; return; fi
  log "Installing Caddy…"
  case "$PKG" in
    apt)
      pkg_install debian-keyring debian-archive-keyring apt-transport-https
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
      curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
      apt-get update -qq; pkg_install caddy ;;
    dnf|yum) pkg_install 'dnf-command(copr)' || true; dnf -y copr enable @caddy/caddy || true; pkg_install caddy ;;
    pacman) pkg_install caddy ;;
  esac
  ok "Caddy installed."
}

ensure_nginx() {
  if command -v nginx >/dev/null 2>&1; then ok "Nginx already installed."; return; fi
  log "Installing Nginx…"; pkg_install nginx; ok "Nginx installed."
}

ensure_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then ok "cloudflared already installed."; return; fi
  log "Installing cloudflared…"
  local arch; arch="$(uname -m)"
  case "$arch" in x86_64) arch=amd64 ;; aarch64|arm64) arch=arm64 ;; armv7l) arch=arm ;; esac
  case "$PKG" in
    apt)
      curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch}.deb -o /tmp/cloudflared.deb
      dpkg -i /tmp/cloudflared.deb || apt-get -f install -y ;;
    *)
      curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${arch} -o /usr/local/bin/cloudflared
      chmod +x /usr/local/bin/cloudflared ;;
  esac
  ok "cloudflared installed."
}

ask()        { local p="$1" d="${2:-}" v; read -rp "$(echo -e "${c_blu}?${c_reset} $p ${c_dim}[${d}]${c_reset}: ")" v; echo "${v:-$d}"; }
ask_secret() { local p="$1" v; read -rsp "$(echo -e "${c_blu}?${c_reset} $p: ")" v; echo >&2; echo "$v"; }
ask_yn()     { local p="$1" d="${2:-y}" v; read -rp "$(echo -e "${c_blu}?${c_reset} $p ${c_dim}(y/n) [${d}]${c_reset}: ")" v; v="${v:-$d}"; [[ "$v" =~ ^[Yy] ]]; }
rand()       { head -c "${1:-24}" /dev/urandom | od -An -tx1 | tr -d ' \n'; }

run_wizard() {
  hr; echo -e "${c_bold}Configuration${c_reset}"; hr
  BASE_DOMAIN="$(ask 'Base domain (apps deploy under *.DOMAIN)' 'your-domain.com')"
  DASH_SUB="$(ask 'Dashboard subdomain' 'dash')"
  API_PORT="$(ask 'Internal API port' '8080')"
  PROXY_HTTP_PORT="$(ask 'Reverse-proxy HTTP port (tunnel target; keep off 80)' '8088')"

  ADMIN_EMAIL="$(ask 'Admin email' 'admin@'"$BASE_DOMAIN")"
  while :; do
    ADMIN_PASS="$(ask_secret 'Admin password (min 8 chars)')"
    [ "${#ADMIN_PASS}" -ge 8 ] && break || warn 'Too short.'
  done

  if ask_yn 'Use Caddy as the reverse proxy? (No = Nginx)' 'y'; then PROXY=caddy; else PROXY=nginx; fi

  DB_DRIVER=sqlite; DB_HOST=127.0.0.1; DB_PORT=3306; DB_NAME=mintaz; DB_USER=mintaz; DB_PASSWORD=""
  if ask_yn 'Use MariaDB/MySQL instead of SQLite? (recommended for multi-instance)' 'n'; then
    DB_DRIVER=mysql
    DB_HOST="$(ask 'Database host' '127.0.0.1')"
    DB_PORT="$(ask 'Database port' '3306')"
    DB_NAME="$(ask 'Database name' 'mintaz')"
    DB_USER="$(ask 'Database user' 'mintaz')"
    DB_PASSWORD="$(ask_secret 'Database password')"
  fi

  REDIS_URL=""
  if ask_yn 'Enable Redis (shared rate-limit + cache across instances)?' 'n'; then
    REDIS_URL="$(ask 'Redis URL' 'redis://127.0.0.1:6379')"
  fi

  GITHUB_SECRET="$(ask 'Default GitHub webhook secret (blank = random)' '')"
  [ -z "$GITHUB_SECRET" ] && GITHUB_SECRET="$(rand 24)"

  SETUP_TUNNEL=n; CF_TOKEN=""
  if ask_yn 'Set up the Cloudflare Tunnel now?' 'y'; then
    SETUP_TUNNEL=y
    echo -e "${c_dim}  Create a tunnel in Cloudflare Zero Trust → Networks → Tunnels,${c_reset}"
    echo -e "${c_dim}  choose the connector install for Linux, and paste the token below.${c_reset}"
    CF_TOKEN="$(ask_secret 'Cloudflare Tunnel connector token (blank to skip)')"
    [ -z "$CF_TOKEN" ] && { SETUP_TUNNEL=n; warn 'No token — skipping tunnel install.'; }
  fi
  TUNNEL_NAME="$(ask 'Tunnel name (for reference)' 'mintaz-tunnel')"

  JWT_SECRET="$(rand 32)"
  IP_HASH_SALT="$(rand 32)"
  SECRET_KEY="$(rand 32)"
  DASH_DOMAIN="${DASH_SUB}.${BASE_DOMAIN}"

  hr
  echo -e "  Base domain     : ${c_grn}${BASE_DOMAIN}${c_reset}"
  echo -e "  Dashboard       : ${c_grn}https://${DASH_DOMAIN}${c_reset}"
  echo -e "  Reverse proxy   : ${c_grn}${PROXY}${c_reset}"
  echo -e "  Database        : ${c_grn}$([ "$DB_DRIVER" = mysql ] && echo "MariaDB/MySQL ($DB_USER@$DB_HOST:$DB_PORT/$DB_NAME)" || echo "SQLite")${c_reset}"
  echo -e "  Redis           : ${c_grn}$([ -n "$REDIS_URL" ] && echo "$REDIS_URL" || echo "off (in-memory)")${c_reset}"
  echo -e "  Admin           : ${c_grn}${ADMIN_EMAIL}${c_reset}"
  echo -e "  Cloudflare tun. : ${c_grn}$([ "$SETUP_TUNNEL" = y ] && echo "yes ($TUNNEL_NAME)" || echo "manual/skip")${c_reset}"
  hr
  ask_yn 'Proceed with these settings?' 'y' || die 'Aborted by user.'
}

CADDY_SNIPPET="/etc/caddy/mintaz.routes.caddy"
NGINX_SNIPPET="/etc/nginx/conf.d/mintaz.conf"

write_env() {
  log "Writing backend/.env…"
  cat > "$INSTALL_DIR/backend/.env" <<EOF
PORT=$API_PORT
HOST=0.0.0.0
BASE_DOMAIN=$BASE_DOMAIN
DASH_SUBDOMAIN=$DASH_SUB
JWT_SECRET=$JWT_SECRET
IP_HASH_SALT=$IP_HASH_SALT
SECRET_KEY=$SECRET_KEY
TOKEN_TTL=7d
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASS
DATA_DIR=./data
WORK_DIR=./workdir
DB_PATH=./data/mintaz.sqlite
STATIC_DIR=../frontend/dist
DB_DRIVER=$DB_DRIVER
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
REDIS_URL=$REDIS_URL
DOCKER_BIN=docker
PORT_RANGE_START=21000
PORT_RANGE_END=21999
DEFAULT_RESTART_POLICY=unless-stopped
AUTO_CLEANUP=true
PROXY=$PROXY
PROXY_HTTP_PORT=$PROXY_HTTP_PORT
CADDY_SNIPPET=$CADDY_SNIPPET
CADDY_RELOAD_CMD=systemctl reload caddy
NGINX_SNIPPET=$NGINX_SNIPPET
NGINX_RELOAD_CMD=systemctl reload nginx
GITHUB_WEBHOOK_SECRET=$GITHUB_SECRET
CF_TUNNEL_NAME=$TUNNEL_NAME
EOF
  chown "$RUN_USER":"$RUN_USER" "$INSTALL_DIR/backend/.env" 2>/dev/null || true
  ok "Environment written."
}

build_app() {
  log "Installing dependencies + building frontend (this can take a few minutes)…"
  sudo -u "$RUN_USER" bash -c "cd '$INSTALL_DIR/backend' && npm install --no-audit --no-fund"
  sudo -u "$RUN_USER" bash -c "cd '$INSTALL_DIR/frontend' && npm install --no-audit --no-fund && npm run build"
  ok "Build complete."
  log "Initializing database + seeding admin…"
  sudo -u "$RUN_USER" bash -c "cd '$INSTALL_DIR/backend' && npm run db:init"
  ok "Database ready."
}

configure_proxy() {
  if [ "$PROXY" = "caddy" ]; then
    log "Configuring Caddy…"
    mkdir -p /etc/caddy
    touch "$CADDY_SNIPPET"
    chown "$RUN_USER":"$RUN_USER" "$CADDY_SNIPPET" 2>/dev/null || true
    sed -e "s|__DASH_DOMAIN__|$DASH_DOMAIN|g" \
        -e "s|__API_PORT__|$API_PORT|g" \
        -e "s|__PROXY_HTTP_PORT__|$PROXY_HTTP_PORT|g" \
        -e "s|__CADDY_SNIPPET__|$CADDY_SNIPPET|g" \
        "$INSTALL_DIR/deploy/caddy/Caddyfile.template" > /etc/caddy/Caddyfile
    systemctl enable caddy >/dev/null 2>&1 || true
    systemctl restart caddy
    ok "Caddy configured and running."
  else
    log "Configuring Nginx…"
    mkdir -p /etc/nginx/conf.d
    touch "$NGINX_SNIPPET"
    chown "$RUN_USER":"$RUN_USER" "$NGINX_SNIPPET" 2>/dev/null || true
    sed -e "s|__DASH_DOMAIN__|$DASH_DOMAIN|g" \
        -e "s|__API_PORT__|$API_PORT|g" \
        -e "s|__PROXY_HTTP_PORT__|$PROXY_HTTP_PORT|g" \
        "$INSTALL_DIR/deploy/nginx/mintaz.conf.template" > /etc/nginx/conf.d/mintaz-dash.conf
    nginx -t && systemctl enable nginx >/dev/null 2>&1 || true
    systemctl restart nginx
    ok "Nginx configured and running."
  fi
}

install_service() {
  log "Installing systemd service mintaz-api…"
  sed -e "s|__INSTALL_DIR__|$INSTALL_DIR|g" \
      -e "s|__USER__|$RUN_USER|g" \
      "$INSTALL_DIR/deploy/systemd/mintaz-api.service" > /etc/systemd/system/mintaz-api.service
  systemctl daemon-reload
  systemctl enable mintaz-api >/dev/null 2>&1 || true
  systemctl restart mintaz-api
  sleep 2
  if systemctl is-active --quiet mintaz-api; then ok "mintaz-api is running."
  else err "mintaz-api failed to start — check: journalctl -u mintaz-api -n 50"; fi
}

configure_tunnel() {
  [ "$SETUP_TUNNEL" = y ] || { warn "Cloudflare Tunnel skipped. Point a tunnel at http://localhost:${PROXY_HTTP_PORT} manually."; return; }
  log "Installing cloudflared tunnel service…"
  cloudflared service uninstall >/dev/null 2>&1 || true
  cloudflared service install "$CF_TOKEN"
  systemctl enable cloudflared >/dev/null 2>&1 || true
  systemctl restart cloudflared || true
  ok "cloudflared connector installed."
  echo -e "${c_dim}  In the Cloudflare dashboard add public hostnames for this tunnel:${c_reset}"
  echo -e "${c_dim}    ${DASH_DOMAIN}      → http://localhost:${PROXY_HTTP_PORT}${c_reset}"
  echo -e "${c_dim}    *.${BASE_DOMAIN}    → http://localhost:${PROXY_HTTP_PORT}${c_reset}"
  echo -e "${c_dim}    ${BASE_DOMAIN}      → http://localhost:${PROXY_HTTP_PORT}${c_reset}"
}

print_summary() {
  echo; hr; echo -e "${c_grn}${c_bold}  Mintaz is installed.${c_reset}"; hr
  echo -e "  Dashboard : ${c_cyn}https://${DASH_DOMAIN}${c_reset}"
  echo -e "  Local API : ${c_cyn}http://localhost:${API_PORT}${c_reset}"
  echo -e "  Admin     : ${c_cyn}${ADMIN_EMAIL}${c_reset}"
  echo
  echo -e "  Service   : ${c_dim}systemctl status mintaz-api${c_reset}"
  echo -e "  Logs      : ${c_dim}journalctl -u mintaz-api -f${c_reset}"
  echo -e "  Proxy     : ${c_dim}${PROXY} → snippet $([ "$PROXY" = caddy ] && echo "$CADDY_SNIPPET" || echo "$NGINX_SNIPPET")${c_reset}"
  echo
  echo -e "  Webhook URL per project is shown in the dashboard → project → Webhook."
  if [ "$RUN_USER" != "root" ]; then
    warn "If deploys can't reach Docker, log out/in so the 'docker' group applies, then: systemctl restart mintaz-api"
  fi
  hr
}

main() {
  banner
  detect_os
  run_wizard

  hr; echo -e "${c_bold}Installing dependencies${c_reset}"; hr
  pkg_update
  ensure_base
  ensure_docker
  ensure_node
  ensure_pm2
  if [ "$PROXY" = caddy ]; then ensure_caddy; else ensure_nginx; fi
  ensure_cloudflared

  hr; echo -e "${c_bold}Configuring Mintaz${c_reset}"; hr
  write_env
  build_app
  configure_proxy
  install_service
  configure_tunnel

  print_summary
}

main "$@"
