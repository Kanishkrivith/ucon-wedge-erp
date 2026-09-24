# UCON Wedge ERP v2 — Online Deployment Guide

This guide provides 3 proven deployment methods to put your ERP online:

---

## ⚡ Method 1: Instant Online Access (Live in 2 Minutes)
**Best for**: Immediate online testing, mobile access from the shopfloor, sharing with colleagues, zero hosting costs, and keeping all existing local OCR data intact.

### How it works:
Keeps your local Next.js server and PostgreSQL database running on your machine, while Cloudflare provides a secure, encrypted HTTPS link to the internet.

1. **Start the production server locally**:
   ```bash
   npm run start
   ```
   *(The app will be running on `http://localhost:3000`)*

2. **Open a public HTTPS tunnel in a new terminal**:
   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```
   *(Or using localtunnel)*:
   ```bash
   npx localtunnel --port 3000
   ```

3. Cloudflare will output an instant secure HTTPS link, for example:
   `https://ucon-wedge-preview.trycloudflare.com`
   Anyone on any phone, tablet, or laptop can open this URL anywhere in the world!

---

## ☁️ Method 2: 100% Cloud Deployment (Render.com or Railway.app)
**Best for**: Permanent 24/7 online hosting without needing to keep your local computer turned on.

### Step 1: Push your Code to GitHub
We have already initialized git and committed all files cleanly.
```bash
git remote add origin https://github.com/YOUR_USERNAME/ucon_wedge_erp_v2.git
git push -u origin main
```

### Step 2: Create a Cloud PostgreSQL Database
You can create a free hosted PostgreSQL database on:
- **Render.com** (Free PostgreSQL)
- **Neon.tech** (Serverless PostgreSQL, highly recommended)
- **Supabase.com** (Managed PostgreSQL)

Once created, copy the connection string (e.g. `postgresql://user:pass@ep-cool-db.us-east-1.aws.neon.tech/neondb?sslmode=require`).

### Step 3: Import your Existing ERP Data & Tables
Restore the complete database dump generated at `scripts/ucon_wedge_backup.sql`:
```bash
psql "YOUR_CLOUD_DATABASE_URL" < scripts/ucon_wedge_backup.sql
```
*(All 25 tables, user accounts, machine inventory, documents, and historical invoices will be imported)*.

### Step 4: Deploy Web Service on Render or Railway
1. In [Render.com](https://render.com), click **New +** $\rightarrow$ **Web Service**.
2. Select your GitHub repository `ucon_wedge_erp_v2`.
3. Render automatically detects the **Dockerfile** we created.
4. Add the Environment Variables:
   - `DATABASE_URL` = `your_cloud_postgres_url`
   - `APP_URL` = `https://your-app-name.onrender.com`
   - `JWT_SECRET` = `ucon_wedge_master_secret_key_2026_super_secure`
   - `NODE_ENV` = `production`
5. Click **Deploy Web Service**!

---

## 🐳 Method 3: Cloud VPS with Docker Compose (AWS EC2 / DigitalOcean / Hetzner)
**Best for**: Self-hosted production server with dedicated performance and complete data ownership.

The project includes a ready-to-run [docker-compose.yml](file:///D:/Ucon%20Wedge%20Unit/ucon_wedge_erp_v2/docker-compose.yml) and [Dockerfile](file:///D:/Ucon%20Wedge%20Unit/ucon_wedge_erp_v2/Dockerfile).

1. Copy the project to your Linux VPS (e.g., Ubuntu 22.04 / 24.04).
2. Run:
   ```bash
   docker compose up -d --build
   ```
3. Docker starts:
   - **PostgreSQL 17** container (`ucon-wedge-db`) on port 5432 with healthchecks and persistent storage.
   - **Next.js 16 Production App** container (`ucon-wedge-erp`) on port 3000.
4. Restore data into the container:
   ```bash
   cat scripts/ucon_wedge_backup.sql | docker exec -i ucon-wedge-db psql -U ucon -d ucon_wedge
   ```
5. Point your domain (e.g., `erp.uconwedge.com`) with Nginx or Caddy with SSL!

---

## 📋 Required Production Environment Variables
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://ucon:pass@host:5432/ucon_wedge` |
| `APP_URL` | Canonical public URL of the web app | `https://erp.uconwedge.com` |
| `JWT_SECRET` | Secret key used for session signing | `ucon_wedge_master_secret_key_2026_super_secure` |
| `NODE_ENV` | Application environment mode | `production` |
