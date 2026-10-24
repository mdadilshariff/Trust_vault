# TrustVault: Supabase & Vercel Deployment Guide

This guide explains how to connect your **Supabase PostgreSQL database** and deploy the **Frontend to Vercel**.

---

## 1. Supabase Database Setup

You have two fast, reliable ways to initialize your Supabase database:

### Option A: Via Supabase SQL Editor (Fastest, No Terminal Required)
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project, click **SQL Editor** in the left sidebar, and click **+ New query**.
3. Copy the entire contents of [`backend/supabase_schema.sql`](../backend/supabase_schema.sql) and paste it into the editor.
4. Click **Run** (or press `Ctrl+Enter`).
5. All tables (`users`, `documents`, `document_permissions`, `audit_events`), enums, indexes, and pre-seeded demo accounts (`admin`, `alice`, `bob`) will be created instantly.

### Option B: Via Terminal / Alembic
1. Go to Supabase Dashboard -> **Project Settings** -> **Database** -> **Connection string** -> **URI**.
2. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password.
3. In your `.env` file, set:
   ```env
   DATABASE_URL=postgresql+asyncpg://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?ssl=require
   SYNC_DATABASE_URL=postgresql://postgres.[YOUR-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
4. Run migrations:
   ```bash
   cd backend
   alembic upgrade head
   python seed.py
   ```

---

## 2. Deploying the Backend API (FastAPI)

FastAPI requires an active server process to handle requests, manage file uploads, and validate session cookies. Free and one-click deployment options include **Render**, **Railway**, or **Fly.io**:

### Deploy on Render / Railway
1. Push your repository to GitHub.
2. In [Render](https://render.com) or [Railway](https://railway.app), create a new **Web Service** from your GitHub repo.
3. Configure the build and start commands:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `DATABASE_URL`: Your Supabase connection string (`postgresql+asyncpg://...`)
   - `SECRET_KEY`: A random 64-character string
   - `CORS_ORIGINS`: `https://[YOUR-VERCEL-APP].vercel.app,http://localhost:5173`
   - `ENVIRONMENT`: `production`
5. Click **Deploy**. Note your backend URL (e.g., `https://trustvault-api.onrender.com`).

---

## 3. Deploying the Frontend to Vercel

The frontend is fully configured for Vercel with automated client-side SPA routing (`vercel.json`).

### Steps:
1. Push your code to your GitHub repository.
2. Go to [Vercel](https://vercel.com) and click **Add New** -> **Project**.
3. Import your GitHub repository.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click edit and select `frontend` (or leave default if deploying the monorepo, as root `vercel.json` handles both).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Environment Variables**:
   Add this environment variable under the project settings:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-api.onrender.com` (your deployed backend URL from step 2)
6. Click **Deploy**.

---

## 4. Verification Checklist

- [ ] Supabase SQL schema executed; tables and demo accounts present in Table Editor.
- [ ] Backend deployed and returns `{"status":"ok"}` or Swagger UI at `/api/docs`.
- [ ] Vercel frontend deployed and loads the login screen at `https://[project].vercel.app`.
- [ ] Log in as `alice@trustvault.dev` (`Alice1234!`) and test document upload and sharing.
