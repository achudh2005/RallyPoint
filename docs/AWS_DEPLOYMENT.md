# RallyPoint AWS Production Deployment Guide

## Overview
- **Live Production URL**: `https://rallypoint.54.79.20.200.sslip.io`
- **API Health Endpoint**: `https://rallypoint.54.79.20.200.sslip.io/health`
- **Swagger API Docs**: `https://rallypoint.54.79.20.200.sslip.io/api/docs`
- **EC2 Instance**: `54.79.20.200` (`i-01f7443e6c2a2ff8a`, Ubuntu 24.04 LTS, Region: `ap-southeast-2` Sydney)
- **SSH Key**: `C:\Users\achud\.ssh\smartprint-key.pem` (`ubuntu@54.79.20.200`)

---

## Infrastructure Architecture

| Layer | Service / Path | Details |
|---|---|---|
| **Domain & DNS** | `rallypoint.54.79.20.200.sslip.io` | Direct wildcard DNS mapping to EC2 IP `54.79.20.200` |
| **Reverse Proxy** | Nginx (`/etc/nginx/sites-available/rallypoint`) | Proxies frontend SPA, `/api/`, `/health`, and `/socket.io/` WebSocket |
| **SSL / TLS** | Let's Encrypt via Certbot | Automatic renewal enabled, auto-redirect HTTP (80) -> HTTPS (443) |
| **Frontend SPA** | `/var/www/rallypoint` | Built production bundle from `apps/web/dist` |
| **Backend API** | PM2 Process: `rallypoint-api` | Port `5003`, running `apps/api/dist/server.js` |
| **Database** | PostgreSQL 16 (`rallypoint_db`) | Port `5432`, managed via Prisma ORM |

---

## Port Allocation Matrix
- **Port 5000**: `smartprint-api` (`https://54.79.20.200.sslip.io`)
- **Port 5002**: `findback-api` (`https://findback.54.79.20.200.sslip.io`)
- **Port 5003**: `rallypoint-api` (`https://rallypoint.54.79.20.200.sslip.io`)
- **Port 5432**: PostgreSQL 16 (shared engine, separate DBs: `smartprint`, `findback_db`, `rallypoint_db`)

---

## Quick Redeploy Script (Remote)
To update the deployment after committing changes to GitHub:

```bash
ssh -i "C:\Users\achud\.ssh\smartprint-key.pem" ubuntu@54.79.20.200 'bash -s' << 'EOF'
set -e
cd /home/ubuntu/rallypoint

# 1. Pull latest code
git pull origin main

# 2. Build packages
cd /home/ubuntu/rallypoint/packages/engine && npm run build --if-present
cd /home/ubuntu/rallypoint/packages/scoring-rules && npm run build --if-present
cd /home/ubuntu/rallypoint/packages/ranking && npm run build --if-present
cd /home/ubuntu/rallypoint/packages/ui && npm run build --if-present
cd /home/ubuntu/rallypoint/packages/db && npx prisma db push --accept-data-loss && npm run build

# 3. Build API & restart PM2
cd /home/ubuntu/rallypoint/apps/api && npx prisma generate && npm run build
pm2 restart rallypoint-api

# 4. Build Web & copy to /var/www/rallypoint
cd /home/ubuntu/rallypoint/apps/web && npm run build
sudo cp -r dist/* /var/www/rallypoint/
sudo systemctl reload nginx

echo "RallyPoint successfully updated!"
EOF
```
