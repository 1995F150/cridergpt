# CriderGPT / Tailscale reachability investigation

Read-only checks on 2026-10-19. Run `python3 scripts/network/diagnose_tailscale.py` to compare UDP, TCP and encrypted DNS. Results are saved in `observed-dns.json`; no user browsing history, keys or private messages are collected.

## Confirmed

- Tailscale is running on this Ubuntu server, which advertises exit-node routes and a private subnet. The server is not itself using an exit node and accepts no Tailscale DNS override. Tailnet configuration shown to the server has MagicDNS, no global resolvers, and a split route for `ts.net` only; it does not show a CriderGPT-specific DNS override.
- UDP DNS for `cridergpt.com` and `www.cridergpt.com` returns `18.204.152.241` and the unspecified IPv6 address `::`, including queries nominally directed to external resolvers. TCP DNS to the same resolver and HTTPS DNS return Cloudflare addresses instead. No change was made to authoritative DNS.
- Pi-hole's readable config has no CriderGPT host override, default blocking IP behavior, and external upstream resolvers. Its domain-list database has no exact or matching regex allow/block rule for the public website, API, or existing Lovable domain. The protected legacy custom-host file could not be read without administrator access. These checks do not establish that all Pi-hole paths are clean.
- HTTPS to the UDP-returned address fails immediately. HTTPS requests with public Cloudflare addresses forced still timed out from this server for the website, so a DNS fix alone has not been proven sufficient; network/SNI filtering also remains possible. The public API domain resolves normally on this path. HEAD returning 501 for `/v1/health` is expected from this server's GET-only health implementation, not evidence that the API is down.

## Interpretation and remaining check

The DNS replies are inconsistent with public encrypted/TCP resolution and are consistent with upstream DNS filtering or interception. The responsible router/ISP/filter has not been identified. This is not evidence that Lovable moved/deleted the website, nor proof of a Tailscale defect.

A device using this machine as an exit node routes its traffic through this home network and may inherit its DNS behavior. Tailscale documents this at https://tailscale.com/docs/reference/dns-in-tailscale and https://tailscale.com/docs/features/exit-nodes. The user's client exit-node setting cannot be inspected remotely here. A question is pending: leave Tailscale connected, select Exit Node → None, and retest the same `https://cridergpt.com/chat` URL. This test is reversible and keeps tailnet access.

If that succeeds, review the home router/ISP security events and approve the **domains**, not fixed Cloudflare IP addresses: `cridergpt.com` and `www.cridergpt.com`. Test `api.cridergpt.com` independently and approve only if blocked. Do not turn off all security filters or publish the private server. Relevant official vendor instructions, conditional on which product is actually installed:

- Plume/HomePass: https://support.plume.com/s/article/How-do-I-approve-unblock-a-website?language=en_US
- eero: https://eero.com/support/articles/what-is-block-and-allow-sites
- Bell Guard: https://support.bell.ca/Internet/Connection-help/Learning_about_and_managing_Guard

No router, firewall, DNS, Tailscale, reverse-proxy or service configuration was modified by this investigation. Do not install static website hosts entries: public Cloudflare addresses can rotate. After any approved filter correction, reconnect the affected client to clear its DNS cache and rerun these comparisons. If direct/public resolution works but HTTPS remains blocked, inspect the router's domain/TLS security event for the server, without disabling TLS verification.
