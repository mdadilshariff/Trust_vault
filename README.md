# TrustVault

**TrustVault** is a secure, enterprise-grade document sharing web application built for the seven-day individual hackathon. It combines fine-grained document-level authorization, immediate access revocation, cryptographic SHA-256 hash-chained audit logging, and private persistent file storage.

---

## Key Features

- **Robust Authentication & Roles**: Argon2id password hashing, secure server-validated sessions (HTTP-Only cookies), and role separation (`admin`, `user`).
- **Administrative Isolation**: Administrators manage users and review audit trails, but **cannot** read or download documents unless explicitly granted access by the owner.
- **Granular Document Permissions**: Document owners can grant `read` or `edit` permissions to named registered users.
- **Immediate Revocation**: Revoking permissions removes database access instantly; the very next HTTP request is blocked with `403 Forbidden`.
- **Cryptographic Audit Trail**: SHA-256 hash-chained audit logging with deterministic JSON serialization and an automated verification tool (`/api/audit/integrity`).
- **Secure File Storage**: Files are saved in a private directory with server-generated UUID filenames, magic byte verification, strict extension whitelisting, and size validation (50MB).
- **Automated Security & Mutation Tests**: 18 automated tests covering IDOR, privilege escalation, path traversal, revocation, and an isolated mutation test demonstrating authorization necessity.
- **Polished SaaS Interface**: Built with React 18, TypeScript, Tailwind CSS, Lucide icons, glassmorphism accents, and responsive layout.

---

## Tech Stack

| Component | Technology | Version |
|---|---|---|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, Zustand, React Router | React 18.3, Vite 6.0 |
| **Backend** | Python, FastAPI, SQLAlchemy 2, Alembic, Uvicorn | Python 3.12+, FastAPI 0.115 |
| **Database** | PostgreSQL | PostgreSQL 16 Alpine |
| **Authentication**| Argon2id (`argon2-cffi`), Server Session Cookies | argon2-cffi 23.1 |
| **Testing** | Pytest, HTTPX (ASGI) | Pytest 8.3, HTTPX 0.27 |
| **Infrastructure**| Docker Compose, Nginx, Named Persistent Volumes | Docker 24+ |

---

## Project Structure

```
trustvault/
├── backend/
│   ├── alembic/              # Database migration scripts
│   ├── app/
│   │   ├── api/              # REST route endpoints (auth, docs, permissions, audit, admin)
│   │   ├── core/             # Authorization, security (Argon2id), and storage utilities
│   │   ├── models/           # SQLAlchemy 2 models (User, Document, Permission, Audit)
│   │   ├── schemas/          # Pydantic v2 validation models
│   │   └── services/         # Audit hash chain & document business logic
│   ├── tests/                # Automated security, auth, and mutation tests
│   ├── Dockerfile
│   ├── requirements.txt
│   └── seed.py               # Development demo account seed script
├── frontend/
│   ├── src/
│   │   ├── api/              # Axios API client
│   │   ├── components/       # Layout, Navigation, ProtectedRoute guards
│   │   ├── pages/            # Dashboard, Documents, Upload, Detail, Audit, Admin
│   │   └── store/            # Zustand auth state
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docs/
│   ├── API.md                # REST API documentation
│   ├── DEPLOYMENT.md         # Production setup & ops guide
│   ├── DEMO_SCRIPT.md        # 5-minute hackathon demo script
│   ├── PERMISSIONS.md        # Authorization matrix & revocation semantics
│   └── TESTING.md            # Automated testing & mutation test details
├── docker-compose.yml        # Multi-container orchestration
├── THREATS.md                # Threat model & risk assessment
├── PROMPTS.md                # AI usage log & engineering evidence
└── README.md
```

---

## Quickstart (Local Development with Docker Compose)

### 1. Clone & Configure
```bash
git clone <repo_url> trustvault
cd trustvault
cp .env.example .env
```

### 2. Launch Services
```bash
docker compose up -d --build
```
This boots:
- **Database**: PostgreSQL on `localhost:5432`
- **Backend**: FastAPI on `http://localhost:8000`
- **Frontend**: Nginx on `http://localhost:5173`

### 3. Seed Demo Accounts
```bash
docker compose exec backend python seed.py
```

### 4. Access the Application
Open your browser to:
- **Web App**: `http://localhost:5173`
- **Swagger Docs**: `http://localhost:8000/api/docs`

---

## Demo Accounts

| Role | Email | Username | Password |
|---|---|---|---|
| **Administrator** | `admin@trustvault.dev` | `admin` | `Admin1234!` |
| **Document Owner**| `alice@trustvault.dev` | `alice` | `Alice1234!` |
| **Collaborator**  | `bob@trustvault.dev`   | `bob`   | `Bob12345!` |

---

## Running Backend Tests

Run all 18 automated tests directly:
```bash
pytest backend -v
```

Output:
```
backend/tests/test_auth.py::test_register_and_login PASSED
backend/tests/test_auth.py::test_login_wrong_password PASSED
backend/tests/test_auth.py::test_me_unauthenticated PASSED
backend/tests/test_auth.py::test_me_authenticated PASSED
backend/tests/test_auth.py::test_duplicate_register PASSED
backend/tests/test_auth.py::test_logout PASSED
backend/tests/test_security.py::test_bob_cannot_read_alices_document PASSED
backend/tests/test_security.py::test_bob_cannot_download_alices_document PASSED
backend/tests/test_security.py::test_bob_cannot_edit_alices_document PASSED
backend/tests/test_security.py::test_bob_cannot_delete_alices_document PASSED
backend/tests/test_security.py::test_read_only_cannot_edit PASSED
backend/tests/test_security.py::test_revoked_access_blocks_immediately PASSED
backend/tests/test_security.py::test_bob_cannot_manage_permissions PASSED
backend/tests/test_security.py::test_unauthenticated_cannot_list_documents PASSED
backend/tests/test_security.py::test_unauthenticated_cannot_upload PASSED
backend/tests/test_security.py::test_path_traversal_in_upload PASSED
backend/tests/test_security.py::test_admin_not_auto_doc_access PASSED
backend/tests/test_security.py::test_mutation_authorization_check_is_necessary PASSED

======================= 18 passed, 28 warnings in 0.97s =======================
```

---

## Building Frontend

```bash
cd frontend
npm install
npm run build
```

Production build produces optimized static bundle in `frontend/dist/`.

---

## Known Boundaries & Limitations

1. **Local Download Retention**: Revocation immediately terminates access to cloud operations, metadata updates, and future downloads. However, it cannot remotely erase files a user previously downloaded to their personal device storage.
2. **Database Superuser Chain Rewrite**: A SHA-256 hash chain prevents single-row tampering and concurrent insertion races. However, an attacker with full database superuser access could theoretically recompute the entire table. External write-once logging (WORM) is recommended for high-compliance deployments.
