# Cloudflare Tunnel — Expose the Win 11 VM to CriderGPT

> **Goal:** Take the LAN-only noVNC URL `http://192.168.40.198:6080/vnc.html` and turn it into a secure, public, Google-login-gated URL that CriderGPT (cloud AI) can open and control.
>
> **Cost:** $0 (Cloudflare Tunnel + Cloudflare Access free tier covers this entirely).
>
> **Time:** ~15 minutes end-to-end.

---

## What you'll end up with

```
CriderGPT (cloud)  →  https://vm.cridergpt.app
                              │
                              ▼
                   Cloudflare Access (Google login: jessiecrider3@gmail.com only)
                              │
                              ▼
                   Cloudflare Tunnel (encrypted)
                              │
                              ▼
                   cloudflared (running on your Ubuntu server)
                              │
                              ▼
                   http://192.168.40.198:6080  (your noVNC)
                              │
                              ▼
                   Win 11 VM desktop
```

No port forwarding. No exposed home IP. Only your Google account can open the URL.

---

## Prerequisites

1. **A domain on Cloudflare.** If you don't have one, buy `cridergpt.app` (or any domain) on Cloudflare Registrar — usually $10/yr. If your domain is on another registrar, change the nameservers to Cloudflare's (free, takes ~10 min). You only need it on Cloudflare's DNS, not their hosting.
2. **Ubuntu server** that can reach `192.168.40.198:6080` (the same server hosting the VM, or any LAN box).
3. **Cloudflare account** (free): https://dash.cloudflare.com/sign-up

> If you'd rather not buy a domain, skip to the **"Quick Tunnel" alternative** at the bottom — gives you a throwaway `*.trycloudflare.com` URL with zero setup but no auth gating.

---

## Step 1 — Install `cloudflared` on the Ubuntu server

SSH into your Ubuntu server (or use the remote terminal you already have open) and run:

```bash
# Add Cloudflare's apt repo
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update
sudo apt install -y cloudflared

# Verify
cloudflared --version
```

---

## Step 2 — Authenticate cloudflared with your Cloudflare account

```bash
cloudflared tunnel login
```

This prints a URL. Copy it, open it on your main PC's browser, log into Cloudflare, and pick the domain you want to use (e.g., `cridergpt.app`). It writes a cert to `~/.cloudflared/cert.pem`.

---

## Step 3 — Create the tunnel

```bash
cloudflared tunnel create cridergpt-vm
```

Output looks like:
```
Created tunnel cridergpt-vm with id 7a8b9c0d-1234-5678-90ab-cdef12345678
```

**Copy the tunnel ID** — you'll paste it into the config file below.

---

## Step 4 — Write the tunnel config

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Paste this (replace `<TUNNEL_ID>` with the ID from Step 3, and `vm.cridergpt.app` with your actual subdomain):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  # Route the public hostname to your LAN noVNC
  - hostname: vm.cridergpt.app
    service: http://192.168.40.198:6080
    originRequest:
      # noVNC uses websockets — required
      noTLSVerify: true
      connectTimeout: 30s

  # Catch-all (required as the last rule)
  - service: http_status:404
```

Move the credentials file so root can read it:
```bash
sudo cp ~/.cloudflared/<TUNNEL_ID>.json /root/.cloudflared/
```

---

## Step 5 — Point DNS at the tunnel

```bash
cloudflared tunnel route dns cridergpt-vm vm.cridergpt.app
```

This automatically creates the proxied CNAME record in Cloudflare. No manual DNS work needed.

---

## Step 6 — Test it manually first

```bash
sudo cloudflared tunnel run cridergpt-vm
```

Open `https://vm.cridergpt.app/vnc.html` on your phone (off Wi-Fi). You should see your noVNC login page. ✅

If it works, hit `Ctrl+C` and move on.

---

## Step 7 — Install as a systemd service (auto-start on boot)

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

It will now restart automatically forever.

---

## Step 8 — 🛡️ LOCK IT DOWN with Cloudflare Access

> **Do not skip this step.** Without it, anyone who guesses the URL gets your VM desktop.

1. Go to https://one.dash.cloudflare.com/ → **Access** → **Applications** → **Add an application**.
2. Pick **Self-hosted**.
3. Fill in:
   - **Application name:** `CriderGPT VM`
   - **Session duration:** `24 hours`
   - **Application domain:** `vm.cridergpt.app`
4. **Identity providers:** Enable **One-time PIN** (works out of the box, emails you a code) and/or add **Google** as an identity provider.
5. **Add policy:**
   - **Name:** `Owner only`
   - **Action:** `Allow`
   - **Include:** `Emails` → `jessiecrider3@gmail.com`
6. Save.

Now visiting `https://vm.cridergpt.app` requires logging in as you. Anyone else gets blocked.

---

## Step 9 — Give CriderGPT access (the part that actually answers your question)

CriderGPT can't log into Cloudflare Access interactively (it has no browser session). You have two ways to let it through:

### Option 9a — Service Token (recommended for AI/automation)

1. In **Cloudflare Access** → **Service Auth** → **Create Service Token**.
2. Name it `cridergpt-agent`. Save the **Client ID** and **Client Secret** (shown once).
3. Edit the application policy from Step 8 — add a second include rule:
   - **Include:** `Service Auth` → select `cridergpt-agent`.

Then store the credentials in Lovable Cloud as runtime secrets so edge functions can use them:

| Secret name | Value |
|---|---|
| `CF_ACCESS_CLIENT_ID` | the Client ID from step 2 |
| `CF_ACCESS_CLIENT_SECRET` | the Client Secret from step 2 |
| `VM_PUBLIC_URL` | `https://vm.cridergpt.app` |

Any edge function calling the VM just adds these headers:
```ts
const res = await fetch(`${Deno.env.get("VM_PUBLIC_URL")}/api/something`, {
  headers: {
    "CF-Access-Client-Id": Deno.env.get("CF_ACCESS_CLIENT_ID")!,
    "CF-Access-Client-Secret": Deno.env.get("CF_ACCESS_CLIENT_SECRET")!,
  },
});
```

### Option 9b — Bypass policy for the agent's IP (simpler, less secure)

If CriderGPT's edge function calls always come from a known Cloudflare/Supabase IP range, you can add a bypass rule. **Not recommended** — IPs can change. Use 9a.

---

## Step 10 — Verify CriderGPT can reach it

Once you've added the secrets, ask me:

> *"Test the VM tunnel from an edge function."*

I'll create a small `test-vm-tunnel` edge function that calls `${VM_PUBLIC_URL}` with the service-token headers and reports back whether it got through.

---

## What CriderGPT can actually do once connected

With the public URL + service token, an edge function can:

- **Open noVNC programmatically** in a headless browser (Playwright / Puppeteer) → screenshot the desktop, read the screen, click pixels.
- **Skip noVNC entirely** and talk to a small HTTP API you run inside the VM (e.g., a Flask app on `192.168.40.198:5000`) — just add another `ingress` block in `config.yml`. This is *way* faster than VNC for command-style tasks.
- **Stream desktop frames** back to your CriderGPT chat UI as live video (more advanced — ask later).

---

## ⚠️ Things to watch out for

| Risk | Mitigation |
|---|---|
| Forgetting to enable Cloudflare Access | The URL is public to the entire internet. Anyone sees your VM. **Always do Step 8.** |
| VNC password is weak | Set a strong VNC password inside the VM as a second layer. |
| VM has access to your LAN | Treat the VM as untrusted. Don't store SSH keys to your main PC inside it. |
| Service token leaks | Rotate it from the Cloudflare dashboard immediately if you accidentally commit it. |
| noVNC websocket disconnects | The `connectTimeout: 30s` in config helps. If it still drops, raise it. |

---

## Quick Tunnel alternative (no domain, no auth — testing only)

If you just want to see this work *right now* without buying a domain:

```bash
cloudflared tunnel --url http://192.168.40.198:6080
```

It prints a random URL like `https://random-words-1234.trycloudflare.com`. **Anyone with this URL gets full VM access.** Use only for a 2-minute test, then `Ctrl+C`.

---

## Troubleshooting

- **`502 Bad Gateway`** — `cloudflared` can't reach `192.168.40.198:6080`. Test with `curl -v http://192.168.40.198:6080` from the Ubuntu box.
- **Connection drops every few seconds** — websocket timing out. Increase `connectTimeout` and add `keepAliveTimeout: 90s` under `originRequest`.
- **`Access denied`** — your email isn't in the policy, or you logged in with a different Google account.
- **`cloudflared` won't start** — check `sudo journalctl -u cloudflared -f` for the real error.
- **Service token returns `403`** — confirm you added the service token to the application policy in Step 9a (creating the token alone isn't enough).

---

## Files generated by this setup

| Path | Purpose |
|---|---|
| `~/.cloudflared/cert.pem` | Cloudflare account cert from `tunnel login` |
| `~/.cloudflared/<TUNNEL_ID>.json` | Tunnel credentials |
| `/etc/cloudflared/config.yml` | Tunnel routing rules |
| `/etc/systemd/system/cloudflared.service` | Auto-start service |

---

## Next step after this works

Once `vm.cridergpt.app` is up and Access is gated, ping me with **"build the VM control edge function"** and I'll wire CriderGPT to actually drive the desktop (screenshot, click, type) through Playwright + the service token.
