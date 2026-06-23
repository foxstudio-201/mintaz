# Connect GitHub (OAuth) — import repos like Vercel

With a GitHub OAuth App configured, users click **Connect GitHub** in Settings,
authorize once, and then **pick any repository** from a searchable list when
creating a project — no manual URL or token needed. The connected account's
token is used automatically to clone private repos.

> Optional. Without it, you can still deploy any repo by pasting its URL and (for
> private repos) a personal access token per project.

## 1. Create a GitHub OAuth App

GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
(https://github.com/settings/developers)

| Field                        | Production                          | Local dev                              |
|------------------------------|------------------------------------|----------------------------------------|
| Application name             | Mintaz                             | Mintaz        (dev)                    |
| Homepage URL                 | `https://dash.<domain>`            | `http://localhost:5173`                |
| Authorization callback URL   | `https://dash.<domain>/api/github/callback` | `http://localhost:5173/api/github/callback` |

Click **Register application**, then **Generate a new client secret**. Copy the
**Client ID** and **Client secret**.

## 2. Configure the backend

In `backend/.env`:

```bash
GITHUB_OAUTH_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# Public URL the browser uses (must match the OAuth App's callback host).
# Production defaults to https://dash.<domain>; set it explicitly in dev:
PUBLIC_URL=http://localhost:5173
```

Restart the API:

```bash
# dev
cd backend && sg docker -c "npm run dev"     # sg docker only needed until you re-login
# prod
sudo systemctl restart mintaz-api
```

## 3. Use it

1. Dashboard → **Settings → GitHub → Connect GitHub** → authorize on GitHub.
2. You're redirected back; the card shows **Connected as @you**.
3. **New Project** → the Repository step now lists your repos. Search, pick one,
   choose a branch, and continue. Branch and clone URL are filled in for you.

## How it works / security

- The browser flow uses a short-lived signed `state` token tied to your logged-in
  user (CSRF protection). The callback exchanges the `code` for an access token.
- The access token is stored on your user row in the database and **never returned
  to the browser** (the API only exposes `connected` + `login` + `avatar`).
- Clone token precedence at deploy time:
  **project token → connected GitHub account token → global `GITHUB_TOKEN`**.
- Disconnect any time from Settings (clears the stored token).

## Troubleshooting

- **"GitHub OAuth not configured"** — `GITHUB_OAUTH_CLIENT_ID/SECRET` not set, or
  the API wasn't restarted.
- **redirect_uri mismatch** — the OAuth App's callback URL must exactly match
  `<PUBLIC_URL>/api/github/callback`.
- **Repos list empty / 401** — token expired or revoked; click Disconnect, then
  Connect again.
