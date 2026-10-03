# Deploy Citymarket Dakar on a Hostinger VPS (Node + Nginx + Neon)

This guide takes the app from this repository to a live, HTTPS site on
`citymarketbusiness.shop`, running on a Hostinger VPS with the database on Neon.

**Architecture**

```
Browser ──HTTPS──> Nginx ──┬── serves dist/ (static React build)
                           └── /functions/* ──> Node server (127.0.0.1:8080) ──TLS──> Neon Postgres
```

- The frontend is a static Vite/React build (`dist/`). Nginx serves it directly.
- The backend is the same Edge-Function code (`functions/`) run by a small Node
  server (`server/index.mjs`) that talks to Neon with the `pg` driver. The data
  layer (`functions/lib/db.mjs`) auto-detects a Postgres pool, so **no route code
  changes** between Qoder hosting and this VPS.
- The only secret is `DATABASE_URL`, kept in `server/.env` (gitignored).

---

## 0. Before you start — you need

| Item | Where |
|---|---|
| Hostinger VPS with SSH (Ubuntu 22.04/24.04 recommended) + its public IP | Hostinger hPanel → VPS |
| Domain `citymarketbusiness.shop` DNS control | Your registrar / Hostinger |
| Neon connection string (`DATABASE_URL`) | Neon console → Connection Details |
| Founder admin password to set | You choose it |

> **Security:** the Neon password was shared in plain text earlier. **Rotate it**
> in the Neon console (Roles → reset password) before going live, and use the new
> connection string everywhere. Never commit `.env`.

---

## 1. Point the domain at the VPS

In your DNS manager, create/replace:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `<YOUR_VPS_IP>` | 3600 |
| A | `www` | `<YOUR_VPS_IP>` | 3600 |

Wait for propagation (`ping citymarketbusiness.shop` should show the VPS IP).
SSL issuance in step 8 requires DNS to already point here.

---

## 2. SSH into the VPS

```bash
ssh root@<YOUR_VPS_IP>
```

All commands below run on the VPS.

---

## 3. Install Node 22, Nginx, PM2, Certbot

```bash
apt update && apt -y upgrade
# Node 22 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs nginx git
# PM2 (process manager) + Certbot (SSL)
npm install -g pm2
apt install -y certbot python3-certbot-nginx
node -v && npm -v && nginx -v && pm2 -v
```

---

## 4. Get the code onto the VPS

Create the app directory and clone the repo (or upload it — see alternative).

```bash
mkdir -p /var/www && cd /var/www
git clone https://github.com/senid-221/Dakar-shop.git citymarket
cd /var/www/citymarket
```

> **Private repo?** Either make it private and authenticate
> (`git clone https://<USER>:<TOKEN>@github.com/senid-221/Dakar-shop.git citymarket`),
> or from your own computer upload it:
> ```bash
> # run on YOUR machine, not the VPS
> scp -r ./2c466d65 root@<YOUR_VPS_IP>:/var/www/citymarket
> ```

---

## 5. Install dependencies and build the frontend

```bash
cd /var/www/citymarket
npm ci                 # frontend + build tooling
npm run build          # produces /var/www/citymarket/dist
cd server && npm ci && cd ..
```

`npm run build` runs `tsc --noEmit` then Vite; a lottie-web `eval` warning is
normal and harmless.

---

## 6. Configure the server secret (`server/.env`)

```bash
cd /var/www/citymarket/server
cp .env.example .env
nano .env
```

Set at least:

```
DATABASE_URL=postgresql://neondb_owner:<NEW_PASSWORD>@ep-...-pooler.<region>.aws.neon.tech/<DBNAME>?sslmode=require
PORT=8080
HOST=127.0.0.1
```

Optionally set the founder admin (used only by the setup step):

```
ADMIN_PHONE=775784158
ADMIN_NAME=RWAMIGABO Innocent
ADMIN_PASSWORD=<strong password>
```

Save. Confirm it is ignored by git:

```bash
cd /var/www/citymarket && git check-ignore server/.env   # should print server/.env
```

---

## 7. Initialize Neon (schema + seed + founder admin)

This creates the 20 tables, seeds the bakery catalog, delivery zones, coupons and
settings, and sets the founder admin password. It is idempotent — safe to re-run;
it will not duplicate the catalog.

```bash
cd /var/www/citymarket/server
node --env-file=.env setup-neon.mjs
```

Expected tail:

```
[setup] updated founder admin 775784158 (RWAMIGABO Innocent).
[setup] done. row counts: {"users":2,"categories":1,"products":8,"delivery_zones":15,"coupons":3,"settings":5}
```

---

## 8. Start the backend with PM2

```bash
cd /var/www/citymarket/server
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup systemd        # copy & run the command it prints, so PM2 survives reboots
pm2 logs citymarket --lines 20   # should show: listening on http://127.0.0.1:8080
```

Quick local check (still on the VPS):

```bash
curl -s http://127.0.0.1:8080/functions/v1/app/categories | head -c 200
```

---

## 9. Configure Nginx

```bash
cp /var/www/citymarket/server/nginx.conf.example /etc/nginx/sites-available/citymarket.conf
ln -s /etc/nginx/sites-available/citymarket.conf /etc/nginx/sites-enabled/citymarket.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

The example points `root` at `/var/www/citymarket/dist` and proxies `/functions/`
to `127.0.0.1:8080` — matching the steps above. Edit the `server_name` if your
domain differs.

---

## 10. Issue the SSL certificate (Let's Encrypt)

Easiest path — let Certbot edit Nginx for you:

```bash
certbot --nginx -d citymarketbusiness.shop -d www.citymarketbusiness.shop \
  --redirect --agree-tos -m you@example.com --no-eff-email
```

Certbot obtains the cert, wires up the `ssl_certificate` lines, and enables the
HTTP→HTTPS redirect. It auto-renews (verify with
`systemctl list-timers | grep certbot`).

> If you prefer the manual config in `nginx.conf.example`, first obtain the cert
> with `certbot certonly --webroot -w /var/www/certbot -d citymarketbusiness.shop -d www.citymarketbusiness.shop`,
> create `/var/www/certbot`, then reload Nginx.

---

## 11. Verify the live site

Open `https://citymarketbusiness.shop` in a browser:

- Storefront loads (bakery products, zones, prices).
- Chat assistant answers (ask “who built this app?” → IRAGUHA Vincent).
- Sign in as the founder admin (`775784158` + the password you set) → admin
  dashboard works.
- Place a test cash-on-delivery order → it appears in the admin orders list.

Command-line smoke test:

```bash
curl -s https://citymarketbusiness.shop/functions/v1/app/categories | head -c 200
```

---

## 12. Updating the site later

```bash
cd /var/www/citymarket
git pull
npm ci && npm run build          # frontend
cd server && npm ci && cd ..     # only if server deps changed
pm2 reload citymarket            # zero-downtime backend restart
```

If you changed the schema, re-run `node --env-file=.env server/setup-neon.mjs`
(it only adds missing tables/indexes and never drops data).

---

## 13. Troubleshooting

| Symptom | Fix |
|---|---|
| `502 Bad Gateway` | PM2 app down: `pm2 logs citymarket`. Check `server/.env` `DATABASE_URL`. |
| `service_error` / 503 from API | Neon unreachable: confirm the connection string, that Neon isn't suspended, and the VPS can reach it (`curl -v https://neon.tech` for egress). |
| Blank page, 404 on assets | `dist/` missing or stale: re-run `npm run build`; confirm Nginx `root` path. |
| SSL not working | DNS must point to the VPS first; re-run `certbot --nginx ...`; check `nginx -t`. |
| Login says invalid | Founder admin not set: re-run `setup-neon.mjs` with `ADMIN_PASSWORD`. |
| Port 8080 already used | Change `PORT` in `.env` and `proxy_pass` in Nginx to match, then reload both. |

Useful commands: `pm2 status`, `pm2 logs citymarket`, `systemctl status nginx`,
`tail -f /var/log/nginx/error.log`.

---

## 14. Security notes

- `DATABASE_URL` lives only in `server/.env` (gitignored) — never in the frontend
  bundle, the repo, or Nginx config.
- The Node server binds `127.0.0.1`; only Nginx is exposed on 80/443.
- Admin routes are role-gated server-side (customers get `403`); registration only
  ever creates `customer` accounts.
- Passwords use PBKDF2 (120k iterations, per-user salt); sessions are opaque
  64-hex tokens carried in `x-sm-token`.
- Rotate the Neon password that was shared in chat, and keep VPS SSH key-only if
  possible (`PermitRootLogin prohibit-password`, disable password auth).
- The database currently allows anonymous full CRUD from the platform anon key on
  the Qoder-hosted copy; on this VPS the app is the only writer and Neon is not
  publicly exposed beyond TLS + password. Keep it that way.
