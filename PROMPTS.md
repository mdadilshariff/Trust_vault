# TrustVault — AI Usage & Prompt Log (`PROMPTS.md`)

In compliance with challenge requirements, this document records genuine, dated AI interactions, identified weaknesses, corrective engineering actions, and empirical verification evidence.

---

### Entry 1: Session Cookie Leakage Across AsyncClient Test Fixtures
- **Date**: 2026-10-20
- **Category**: Authentication, Sessions & Test Isolation
- **Real Prompt / Context**:
  > *"Execute Pytest test suite for authentication endpoints (`test_auth.py`) and verify `test_me_unauthenticated` returns 401."*
- **AI Output**:
  Generated a session-scoped fixture:
  ```python
  @pytest_asyncio.fixture(scope="session")
  async def client(test_engine):
      async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
          yield ac
  ```
- **Actual Weakness**:
  The shared `AsyncClient` retained the session cookie in its internal cookie jar across all subsequent test cases. When `test_me_unauthenticated` and `test_unauthenticated_cannot_list_documents` ran after login tests, HTTPX sent the previously authenticated user's session cookie, resulting in unexpected `200 OK` responses instead of `401 Unauthorized`.
- **Correction Applied**:
  Made the `client` fixture function-scoped (`@pytest_asyncio.fixture`) so every test gets a pristine client instance with zero cookies. Extracted authentication fixtures into an isolated helper that returns clean dictionary copies of session cookies (`dict(r.cookies)`).
- **Verification Evidence**:
  `pytest backend/tests/test_auth.py` and `pytest backend/tests/test_security.py` passed with all unauthenticated routes strictly asserting and receiving `401 Unauthorized`.

---

### Entry 2: SQLite Dialect UUID Serialization in Audit Logging
- **Date**: 2026-10-20
- **Category**: Audit Trail & Cryptographic Hash Chain
- **Real Prompt / Context**:
  > *"Implement SHA-256 hash-chained audit logging service (`record_event`) and flush events to database."*
- **AI Output**:
  Passed string representation of actor ID directly into model creation:
  ```python
  event = AuditEvent(sequence=next_seq, actor_id=actor_id, ...)
  db.add(event)
  await db.flush()
  ```
- **Actual Weakness**:
  `actor_id` was passed as a raw `str` (e.g. `'b194b1e0-f578-4761-90f1-96274b1392aa'`). While PostgreSQL performs transparent string-to-UUID casting, SQLAlchemy's `SQLiteDialect_aiosqlite` requires a Python `uuid.UUID` instance for columns declared with `UUID(as_uuid=True)`. The dialect invoked `value.hex`, triggering:
  `AttributeError: 'str' object has no attribute 'hex'`.
- **Correction Applied**:
  Updated `record_event` in `backend/app/services/audit_service.py` to defensively parse `actor_id` into a validated `uuid.UUID` object for model storage, while using the string representation for deterministic JSON canonicalization in SHA-256 calculation.
- **Verification Evidence**:
  All 18 automated backend tests passed. All audit logging operations (`user.register`, `auth.login`, `doc.upload`, `perm.revoke`) persist without database statement errors.

---

### Entry 3: Redundant Index Declarations Causing SQLite DDL Collisions
- **Date**: 2026-10-20
- **Category**: Database Schema & Migration Stability
- **Real Prompt / Context**:
  > *"Define SQLAlchemy models for Document and AuditEvent with indexing on search fields."*
- **AI Output**:
  Specified both column-level indexing and table-level `__table_args__` indexing:
  ```python
  category: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
  ...
  __table_args__ = (
      Index("ix_documents_category", "category"),
  )
  ```
- **Actual Weakness**:
  `index=True` auto-generates index `ix_documents_category`. The subsequent `Index("ix_documents_category", ...)` in `__table_args__` attempted to create an index with the exact same identifier. Under SQLite test execution, this raised:
  `sqlite3.OperationalError: index ix_documents_category already exists`.
- **Correction Applied**:
  Removed duplicate single-column index declarations from `__table_args__` across `document.py` and `audit.py`, preserving only composite indexes (`ix_documents_owner_created`) and unique constraints.
- **Verification Evidence**:
  `Base.metadata.create_all` executed seamlessly in tests and Alembic migrations applied cleanly without DDL conflicts.

---

### Entry 4: Admin Role Document Isolation Verification
- **Date**: 2026-10-20
- **Category**: Centralized Authorization & Privilege Boundaries
- **Real Prompt / Context**:
  > *"Write an automated test confirming that administrators cannot automatically access documents owned by other users."*
- **AI Output**:
  Drafted a test that uploaded a document as Alice (admin) and then made a request with `cookies={}` expecting 401.
- **Actual Weakness**:
  This failed to test the core specification requirement: a logged-in user with the `admin` role must be forbidden (`403 Forbidden`) from viewing or downloading another user's document unless explicitly granted access.
- **Correction Applied**:
  Rewrote `test_admin_not_auto_doc_access` in `backend/tests/test_security.py`:
  1. Bob (regular user) uploads a private document.
  2. Alice (administrator) attempts to access Bob's document using her valid admin session cookie.
  3. The backend enforces `require_document_access`, determines Alice is neither owner nor granted collaborator, and returns `403 Forbidden`.
- **Verification Evidence**:
  `pytest backend/tests/test_security.py::test_admin_not_auto_doc_access` passed, confirming administrators do not have universal document access.

---

### Entry 5: Frontend TypeScript Interface Parameter Mismatch
- **Date**: 2026-10-20
- **Category**: Frontend Compilation & API Type Safety
- **Real Prompt / Context**:
  > *"Compile frontend application using TypeScript and Vite."*
- **AI Output**:
  Typed API helper functions in `frontend/src/api/index.ts` with incomplete query parameters:
  ```typescript
  sharedWithMe: (params?: { page?: number; q?: string }) => api.get('/documents/shared-with-me', { params }),
  ```
  While `DashboardPage.tsx` called:
  ```typescript
  documentsApi.sharedWithMe({ page_size: 5 })
  ```
- **Actual Weakness**:
  `npm run build` failed with TypeScript compilation error `TS2353: Object literal may only specify known properties, and 'page_size' does not exist in type`.
- **Correction Applied**:
  Updated `sharedWithMe` and `my` in `frontend/src/api/index.ts` to include `page_size?: number` to match backend FastAPI endpoint query parameter specifications.
- **Verification Evidence**:
  `npm run build` completed successfully with `0` errors, generating optimized production bundles in `dist/`.
