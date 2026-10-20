# TrustVault — Production Deployment & Operations Guide

This guide covers production deployment using Docker Compose, reverse proxy configuration, environment variable tuning, and operations.

---

## 1. System Architecture

```
[ Client Browser ]
        │ HTTPS (443)
        ▼
[ Nginx Reverse Proxy / Load Balancer ]
        │
   ┌────┴────────────────────────┐
   │                             │
   ▼                             ▼
[ Frontend Service ]          [ Backend Service ]
  Nginx (Static Assets)        FastAPI (Uvicorn ASGI)
                                 │              │
                                 ▼              ▼
                          [ PostgreSQL 16 ]  [ Persistent Storage ]
                          (Docker volume)    (/storage/uploads)
```

---

## 2. Prerequisites

- Docker Engine 24.0+ & Docker Compose v2+
- Domain name with DNS A records configured
- Valid SSL/TLS certificates (Let's Encrypt / Certbot)

---

## 3. Deployment Procedure

### Step 1: Clone Repository & Create Production Environment File

```bash
git clone <repository_url> trustvault
cd trustvault
cp .env.example .env
```

Generate secure production credentials:
```bash
# Generate 64-byte random secret key
python -c "import secrets; print(secrets.token_hex(64))"
```

Configure `.env`:
```ini
ENVIRONMENT=production
SECRET_KEY=<generated-64-byte-hex-key>
POSTGRES_USER=trustvault_prod
POSTGRES_PASSWORD=<strong-random-db-password>
POSTGRES_DB=trustvault_prod

DATABASE_URL=postgresql+asyncpg://trustvault_prod:<password>@db:5432/trustvault_prod
SYNC_DATABASE_URL=postgresql://trustvault_prod:<password>@db:5432/trustvault_prod

UPLOAD_DIR=/storage/uploads
MAX_UPLOAD_BYTES=52428800
CORS_ORIGINS=https://vault.yourdomain.com
```

### Step 2: Build and Start Containers

```bash
docker compose up -d --build
```

### Step 3: Run Database Migrations

Alembic migrations run automatically on container startup via `docker-compose.yml`. To run manually or verify:
```bash
docker compose exec backend alembic upgrade head
```

### Step 4: Seed Initial Accounts (Staging / Demo Only)

> [!WARNING]
> Do NOT run `seed.py` on live customer production systems. Instead, register the first administrator account via `/register`.

For test/demo environments:
```bash
docker compose exec backend python seed.py
```

---

## 4. Persistent Storage Management

> [!IMPORTANT]
> **Ephemeral Disk Risk**: Cloud platforms (e.g., Heroku, ephemeral AWS ECS tasks) destroy container storage on restart. TrustVault requires private persistent storage for files:
> - On bare metal or VPS: Map Docker named volumes to host mount points (e.g. `/var/data/trustvault/uploads`).
> - In cloud clusters: Use AWS EFS, Google Cloud Filestore, or persistent NFS volumes.

To back up uploaded documents:
```bash
docker run --rm -v rag_uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads_backup.tar.gz -C /data .
```

To back up database:
```bash
docker compose exec db pg_dump -U trustvault_prod trustvault_prod > trustvault_db_backup.sql
```

---

## 5. Troubleshooting & Health Checks

### Check System Health
```bash
curl http://localhost:8000/api/health
# Response: {"status": "ok", "version": "1.0.0"}
```

### Inspect Container Logs
```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Verify Audit Hash Chain
```bash
docker compose exec backend python -c "
import asyncio
from app.database import async_session_factory
from app.services.audit_service import verify_chain

async def check():
    async with async_session_factory() as db:
        print(await verify_chain(db))

asyncio.run(check())
"
```

### Common Issues & Solutions

1. **`asyncpg.exceptions.InvalidPasswordError`**:
   Verify that `POSTGRES_PASSWORD` in `.env` matches the password string in `DATABASE_URL`.
2. **`413 Request Entity Too Large`**:
   Nginx reverse proxy caps upload sizes. Ensure `client_max_body_size 50M;` is present in `nginx.conf`.
3. **Session Cookie Rejected**:
   In production (`ENVIRONMENT=production`), `https_only=True` is enforced on session cookies. The frontend must be served over valid HTTPS.
