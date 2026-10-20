# TrustVault — Automated Testing & Mutation Testing Report

TrustVault features automated security, cross-user authorization, session management, and regression tests built using **Pytest** and **HTTPX**.

---

## 1. Test Suite Architecture

- **Framework**: `pytest`, `pytest-asyncio`, `httpx` (ASGI transport)
- **Database Backend in Tests**: In-memory SQLite with async I/O (`sqlite+aiosqlite:///:memory:`)
- **Isolation Guarantee**: Test fixtures utilize independent sessions and ephemeral clients to ensure zero cross-test cookie contamination or shared session state.

---

## 2. Running Backend Tests

Ensure dependencies are installed:
```bash
pip install -r backend/requirements.txt
```

Run the entire test suite:
```bash
pytest backend -v
```

Run only security and authorization tests:
```bash
pytest backend/tests/test_security.py -v
```

---

## 3. Test Inventory & Results

### Auth Suite (`backend/tests/test_auth.py`)

| Test | Objective | Status |
|---|---|:---:|
| `test_register_and_login` | Validates end-to-end registration and session establishment |  PASSED |
| `test_login_wrong_password` | Verifies invalid password returns 401 and logs denied attempt |  PASSED |
| `test_me_unauthenticated` | Unauthenticated GET `/api/auth/me` returns 401 |  PASSED |
| `test_me_authenticated` | Authenticated session receives user profile details |  PASSED |
| `test_duplicate_register` | Prevents registration of existing email/username (409 Conflict) |  PASSED |
| `test_logout` | Destroys server-side session and clears cookie |  PASSED |

### Security & Access Control Suite (`backend/tests/test_security.py`)

| Test | Objective | Status |
|---|---|:---:|
| `test_bob_cannot_read_alices_document` | Cross-user IDOR guard: Bob receives 403 on Alice's private doc |  PASSED |
| `test_bob_cannot_download_alices_document` | Unauthorized download guard: Bob receives 403 on download |  PASSED |
| `test_bob_cannot_edit_alices_document` | Unauthorized edit guard: Bob receives 403 on PATCH |  PASSED |
| `test_bob_cannot_delete_alices_document` | Unauthorized delete guard: Bob receives 403 on DELETE |  PASSED |
| `test_read_only_cannot_edit` | Permission escalation: Read-only collaborator cannot edit doc |  PASSED |
| `test_revoked_access_blocks_immediately` | Revocation immediacy: Revoked user blocked on immediate next call |  PASSED |
| `test_bob_cannot_manage_permissions` | Non-owner cannot list or grant permissions on another's doc |  PASSED |
| `test_unauthenticated_cannot_list_documents` | Anons cannot access document catalogue (401 Unauthorized) |  PASSED |
| `test_unauthenticated_cannot_upload` | Anons cannot upload files (401 Unauthorized) |  PASSED |
| `test_path_traversal_in_upload` | Prevents `../../../etc/passwd` path traversal attacks |  PASSED |
| `test_admin_not_auto_doc_access` | Admin cannot access user docs without explicit grant (403) |  PASSED |
| `test_mutation_authorization_check_is_necessary` | **Isolated Mutation Test** (see below) |  PASSED |

**Total Result**: 18 passed in 0.97s.

---

## 4. Isolated Mutation Test

The challenge requires a reproducible **isolated mutation test** that disables an authorization check in a temporary test fixture and proves that the security test fails without that check, without weakening the production code.

### Implementation Details (`test_mutation_authorization_check_is_necessary` in `test_security.py`)

```python
@pytest.mark.asyncio
async def test_mutation_authorization_check_is_necessary(client, alice_token, bob_token):
    # 1. Baseline: Upload doc as Alice. Verify Bob is DENIED (HTTP 403).
    doc = await upload_doc(client, alice_token, "Mutation Test Doc")
    r_before = await client.get(f"/api/documents/{doc['id']}", cookies=bob_token)
    assert r_before.status_code == 403

    # 2. Patch: Replace require_document_access in docs_module with a mutant
    #    that bypasses the permission check entirely:
    async def _no_auth_check(document_id, user, db, required=None):
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404)
        return doc

    original_ref = docs_module.require_document_access
    docs_module.require_document_access = _no_auth_check

    try:
        # 3. Execution under mutation: Bob accesses Alice's document
        r_mutant = await client.get(f"/api/documents/{doc['id']}", cookies=bob_token)
        # Without authorization check, Bob gets 200 OK — proving the check was the safeguard!
        assert r_mutant.status_code == 200
    finally:
        # 4. Strict cleanup: Restore genuine production reference
        docs_module.require_document_access = original_ref

    # 5. Post-mutation verification: Production enforcement active again
    r_after = await client.get(f"/api/documents/{doc['id']}", cookies=bob_token)
    assert r_after.status_code == 403
```

This verifies that the centralized authorization check is strictly necessary, effective, and non-redundant.

---

## 5. Frontend Build Verification

To test frontend compilation, type checking, and bundling:
```bash
cd frontend
npm run build
```

Result:
```
vite v6.4.4 building for production...
transforming...
✓ 1960 modules transformed.
rendering chunks...
dist/index.html                   0.88 kB │ gzip:   0.47 kB
dist/assets/index-7GpNaxS3.css   31.54 kB │ gzip:   5.54 kB
dist/assets/index-pTYtV3GQ.js   327.00 kB │ gzip: 100.77 kB
✓ built in 3.03s
```
Zero type errors, zero bundling warnings.
