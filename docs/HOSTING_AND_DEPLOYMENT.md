# WorkSphere Cloud Hosting & Deployment Guide

This document provides step-by-step instructions to deploy WorkSphere to production.

---

## Environment Variables Reference

Configure these environment variables in your cloud hosting provider dashboard:

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL pooled connection (PgBouncer) | `postgresql://neondb_owner:***@ep-***-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `DIRECT_URL` | Neon PostgreSQL direct connection (for migrations) | `postgresql://neondb_owner:***@ep-***.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require` |
| `JWT_SECRET` | Cryptographic secret for signing tokens | Generate a random 64-char string |
| `JWT_EXPIRES_IN` | Token validity duration | `7d` |
| `NODE_ENV` | Runtime environment | `production` |
| `PORT` | HTTP port (set automatically by cloud hosts) | `4000` (or host assigned) |
| `VITE_API_BASE_URL` | *(Only if frontend is hosted separately on Vercel)* | `https://your-backend.onrender.com` |

---

## Deployment Option 1: Render.com (Recommended Full-Stack)

Render natively supports WebSockets and can host both the React frontend and Express backend from a single Web Service.

### Steps:
1. Push your repository to GitHub: `https://github.com/akram369/worksphere-realtime-kanban`.
2. Log in to [Render.com](https://render.com) and click **New +** -> **Web Service**.
3. Select your GitHub repository: `worksphere-realtime-kanban`.
4. Configure service settings:
   - **Name**: `worksphere-kanban`
   - **Region**: `Singapore` (matches your Neon database region)
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm install --prefix server && npm install --prefix client && npm run --prefix client build && npx --prefix server prisma generate --schema server/prisma/schema.prisma
     ```
   - **Start Command**:
     ```bash
     node server/src/server.js
     ```
5. Add the **Environment Variables** (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`).
6. Click **Deploy Web Service**.
7. *(Optional)* Run the seed script via Render's **Shell** tab:
   ```bash
   node server/src/db/seedPrisma.js
   ```

---

## Deployment Option 2: Railway.app (1-Click Deployment)

Railway automatically detects Node.js and builds the application.

### Steps:
1. Log in to [Railway.app](https://railway.app).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select `worksphere-realtime-kanban`.
4. Under **Variables**, add:
   - `DATABASE_URL`
   - `DIRECT_URL`
   - `JWT_SECRET`
   - `NODE_ENV` = `production`
5. Under **Settings**:
   - **Build Command**: `npm install --prefix server && npm install --prefix client && npm run build && npm run prisma:generate`
   - **Start Command**: `npm start`
6. Click **Deploy**. Railway will provision a public domain with HTTPS and automatic WebSocket support.

---

## Deployment Option 3: Decoupled (Vercel Frontend + Render/Railway Backend)

If you prefer hosting the client on Vercel's global Edge CDN:

### Backend (Render or Railway):
1. Deploy the backend using the root directory with start command `node server/src/server.js`.
2. Note your backend URL (e.g., `https://worksphere-api.onrender.com`).

### Frontend (Vercel):
1. Import `worksphere-realtime-kanban` on [Vercel](https://vercel.com).
2. Set **Framework Preset**: `Vite`.
3. Set **Root Directory**: `./` (uses `vercel.json` and `client/dist`).
4. Set **Environment Variable**:
   - `VITE_API_BASE_URL` = `https://worksphere-api.onrender.com`
5. Click **Deploy**.

---

## Deployment Option 4: Docker Container (VPS / AWS EC2 / DigitalOcean)

The repository includes a production-ready, multi-stage `Dockerfile` and `docker-compose.yml`.

### Single Command Deployment:
```bash
# 1. Clone repository
git clone https://github.com/akram369/worksphere-realtime-kanban.git
cd worksphere-realtime-kanban

# 2. Copy and configure environment variables
cp .env.example .env
nano .env # Paste your Neon database credentials

# 3. Build and launch container
docker compose up -d --build
```

The application will be live at `http://your-server-ip:4000` with the React client, REST API, and Socket.IO running unified on a single container port.
