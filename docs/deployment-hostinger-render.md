# Deployment & Quickstart Guide (Local, Render & Hostinger)

This guide walks you through seeing your **working MVP immediately** and deploying to **Render** or **Hostinger**.

---

## 1. How to Run Locally & See Your First MVP Immediately

### Prerequisites
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL & Redis)

### Step 1: Install Dependencies
From the root directory (`keno-game/`):
```bash
pnpm install
```

### Step 2: Start PostgreSQL & Redis Database
Using Docker Compose:
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
```
*(If you have local Postgres installed, simply ensure a database named `keno_db` exists on port 5432).*

### Step 3: Run the Backend API
```bash
pnpm --filter @keno/api dev
```
- API will start on: **`http://localhost:3000`**
- **Interactive Swagger / OpenAPI UI:** Open **`http://localhost:3000/api/docs`** in your browser.
  - You can register, log in, view live 20-ball draws, and place bets directly from the interactive docs!

### Step 4: Run the Admin & Game Dashboard
In a new terminal:
```bash
pnpm --filter @keno/admin dev
```
- Open **`http://localhost:5173`** in your browser.
- You can inspect the **live CSPRNG round draws**, **96% RTP mathematical model**, **payout tables**, and **financial stats**.

### Step 5: Run the React Native Mobile App
In a new terminal:
```bash
pnpm --filter @keno/mobile start
```
- Press **`w`** in the terminal to launch the **Web preview** in your browser, or scan the QR code with **Expo Go** on iOS/Android.

---

## 2. Deploying on Render (Easiest Cloud Preview)

Render is great for zero-configuration staging.

### A. Deploy PostgreSQL Database
1. Go to [Render.com Dashboard](https://dashboard.render.com/) -> **New +** -> **PostgreSQL**.
2. Name: `keno-postgres`
3. Copy the **Internal Database URL** and credentials.

### B. Deploy NestJS API (Web Service)
1. In Render Dashboard -> **New +** -> **Web Service** -> Connect your GitHub repo.
2. Select **Docker** as the runtime.
3. Docker Command / Dockerfile Path: `infrastructure/docker/Dockerfile.api`
4. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `DB_HOST`: *(Render Postgres Host)*
   - `DB_PORT`: `5432`
   - `DB_USER`: *(Render Postgres User)*
   - `DB_PASSWORD`: *(Render Postgres Password)*
   - `DB_NAME`: `keno_db`
   - `JWT_ACCESS_SECRET`: `your_random_secret_string_123`
   - `JWT_REFRESH_SECRET`: `your_random_refresh_secret_456`
5. Click **Deploy Web Service**.

### C. Deploy Admin Dashboard (Static Site)
1. In Render Dashboard -> **New +** -> **Static Site**.
2. Build Command: `pnpm install && pnpm --filter @keno/shared-types build && pnpm --filter @keno/game-math build && pnpm --filter @keno/admin build`
3. Publish Directory: `apps/admin/dist`
4. Environment Variables:
   - `VITE_API_URL`: `https://your-api-service.onrender.com`

---

## 3. Deploying on Hostinger (Hostinger VPS)

Hostinger VPS (Ubuntu 22.04 / 24.04 with Docker) is the recommended production host.

### Step 1: Access your Hostinger VPS via SSH
```bash
ssh root@YOUR_HOSTINGER_SERVER_IP
```

### Step 2: Install Docker & Docker Compose (if not already installed)
```bash
apt update && apt install -y docker.io docker-compose git
systemctl enable --now docker
```

### Step 3: Clone Your Repository & Configure Environment
```bash
git clone https://github.com/your-username/keno-game.git /var/www/keno-game
cd /var/www/keno-game
```

### Step 4: Run the Complete Stack with Docker Compose
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d --build
```
This automatically boots:
- PostgreSQL 16 (on port 5432)
- Redis 7 (on port 6379)
- NestJS API (on port 3000)
- Admin Nginx Dashboard (on port 5173)

### Step 5: Configure Nginx & SSL on Hostinger (Domain Setup)
Install Certbot for free Let's Encrypt SSL:
```bash
apt install -y certbot python3-certbot-nginx nginx
```

Create `/etc/nginx/sites-available/keno.conf`:
```nginx
server {
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
    }
}
```

Enable the configuration and issue SSL:
```bash
ln -s /etc/nginx/sites-available/keno.conf /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

---

## 4. Why You Saw "Red Spots" in the Code & How It Is Fixed

In TypeScript monorepos, code editors (like VS Code) display red underlines when:
1. Workspace packages (`@keno/shared-types`, `@keno/game-math`, etc.) are linked via `pnpm-workspace.yaml` instead of plain relative imports.
2. `tsconfig.base.json` needs **path mappings** (`"paths": { "@keno/*": ["packages/*/src"] }`) so the IDE resolves TypeScript types directly from source code without waiting for build outputs.
3. Dependencies are being downloaded into `node_modules/`.

We added `pnpm-workspace.yaml` and path mappings in `tsconfig.base.json` so all types resolve seamlessly across packages and apps!
