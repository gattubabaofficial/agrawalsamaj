# WhatsApp Pass Delivery Service

Sends event pass QR codes to attendees over WhatsApp using
[whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js).

`whatsapp-web.js` is Node-only and the portal backend is Python, so this runs as
a small sidecar process. FastAPI calls it over HTTP whenever an event payment is
approved.

```
FastAPI (:8000) ──POST /send-media──> this service (:3001) ──> WhatsApp Web
```

## Why this replaced Twilio

Twilio's WhatsApp API needs a **publicly downloadable** media URL. In this
deployment `DOMAIN_URL` is `http://localhost:8000`, which Twilio cannot reach, so
the old code silently dropped the image and sent a text message containing an
unreachable link. This service uploads the PNG bytes directly, so the QR arrives
as a real image with no public URL required.

## Setup

```bash
cd whatsapp-service
npm install                 # first run also downloads Chromium (~5 min)
cp .env.example .env        # then set WHATSAPP_API_KEY
npm start
```

`WHATSAPP_API_KEY` here **must match** `WHATSAPP_WEB_API_KEY` in `backend/.env`.

## Linking a phone (one time)

On first start the console prints a pairing QR — or open <http://localhost:3001/qr>.

On the phone that will *send* the passes:
**WhatsApp → Settings → Linked devices → Link a device**, then scan.

The session is persisted to `.wwebjs_auth/`, so restarts do **not** require
re-scanning. Deleting that folder forces a fresh scan.

> Use a dedicated number for this. The linked phone must stay online and
> connected to the internet — whatsapp-web.js drives a real WhatsApp Web session,
> it is not a cloud API.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/status` | — | Session state; poll this for health |
| GET | `/qr` | — | HTML pairing page (auto-refreshes) |
| GET | `/qr.png` | — | Pairing QR as a raw image |
| POST | `/send-media` | `x-api-key` | Send an image with a caption |
| POST | `/send-text` | `x-api-key` | Send a plain text message |

`/send-media` body:

```json
{
  "phone": "9876543210",
  "caption": "Your ticket ...",
  "media": { "base64": "...", "mimetype": "image/png", "filename": "pass.png" }
}
```

`file_path` may be sent instead of `media` when the service shares a filesystem
with the backend. Bare 10-digit numbers get `DEFAULT_COUNTRY_CODE` (default 91)
prepended, and every number is checked against WhatsApp before sending — an
unregistered number returns `404 not_on_whatsapp` rather than failing silently.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Backend logs `Could not reach the whatsapp-web.js sidecar` | Service not running — `npm start` |
| `503 ... status: qr` | Nobody has scanned the pairing QR yet — open `/qr` |
| `404 not_on_whatsapp` | That number has no WhatsApp account |
| `401 Invalid or missing x-api-key` | Key mismatch between the two `.env` files |
| Status stuck on `starting` | Chromium still downloading, or blocked — check console |

## Production notes

- Keep port 3001 bound to localhost / the internal network. It is not
  internet-facing and only protects itself with the shared API key.
- Run under a process manager (pm2, systemd) so it restarts with the host.
- `.wwebjs_auth/` contains credentials for the linked account — it is gitignored;
  keep it out of backups that others can read.
- WhatsApp may rate-limit or ban numbers that send high volumes of unsolicited
  messages. This sends only to people who registered for an event, but bulk
  blasts are a real ban risk.
