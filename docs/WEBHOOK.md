# GitHub Webhooks & Preview Deployments

Mintaz auto-deploys on `push` and `pull_request` events, with HMAC signature
verification.

## Wire up a repository

1. Open the project in the dashboard → **Webhook** tab.
2. Copy the **Payload URL** — `https://dash.<domain>/api/webhooks/github/<projectId>`.
3. Copy the **Secret**.
4. GitHub → repo **Settings → Webhooks → Add webhook**:
   - **Payload URL**: paste it.
   - **Content type**: `application/json` (required — raw body is HMAC-verified).
   - **Secret**: paste it.
   - **Which events**: select **Let me select** → check **Pushes** and
     **Pull requests**.
5. Save. GitHub sends a `ping`; the dashboard shows it under **Recent deliveries**.

## What happens on each event

| Event                          | Behaviour                                                        |
|--------------------------------|-----------------------------------------------------------------|
| `push` to the production branch | Build + deploy production → `https://<app>.<domain>`            |
| `push` to any other branch      | Build + deploy a **branch preview** → `https://<branch>-<app>.<domain>` (if previews on) |
| `pull_request` opened/sync/reopened | Build + deploy a **PR preview** → `https://pr-<n>-<app>.<domain>` |
| `pull_request` closed           | Destroy the PR preview container (if *auto-destroy* on)         |

Branch names are sanitised to a DNS-safe label (e.g. `feature/login` →
`feature-login`).

## Security

- Every request must carry a valid `X-Hub-Signature-256` matching the project's
  secret. Invalid/missing signatures get `401` and are logged as failed
  deliveries.
- Rotate the secret any time from the Webhook tab (then update it in GitHub).

## Manual trigger

You don't need GitHub to deploy — click **Deploy** on the project page, or:

```bash
curl -X POST https://dash.<domain>/api/projects/<id>/deploy \
  -H "authorization: Bearer <jwt>" \
  -H 'content-type: application/json' \
  -d '{"branch":"main"}'
```

## Testing the signature locally

```bash
BODY='{"ref":"refs/heads/main","head_commit":{"id":"abc"}}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')"
curl -X POST http://localhost:8080/api/webhooks/github/<projectId> \
  -H "x-github-event: push" \
  -H "x-hub-signature-256: $SIG" \
  -H 'content-type: application/json' \
  -d "$BODY"
```
