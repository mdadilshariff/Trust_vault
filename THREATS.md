# TrustVault — Threat Model & Security Analysis

This threat model identifies TrustVault's critical assets, trust boundaries, evaluated attack scenarios, active mitigations, empirical test evidence, and residual / accepted risks.

---

## 1. Assets & Security Objectives

| Asset | Confidentiality | Integrity | Availability | Value / Impact |
|---|:---:|:---:|:---:|---|
| **Private Document Files** | Critical | High | High | User private documents, sensitive financial / legal records. Unauthorized disclosure represents a critical breach. |
| **Document Metadata & Permissions**| High | Critical | High | Ownership mappings, titles, access grants. Corruption causes denial of service or unauthorized disclosure. |
| **User Authentication Credentials** | Critical | High | Medium | Passwords hashed with Argon2id. Compromise leads to full account takeover. |
| **Audit Event Stream & Hash Chain** | Medium | Critical | High | Non-repudiation, forensics, and compliance. Tampering invalidates security guarantees. |
| **Administrative Controls** | High | Critical | High | User account status and system auditing. Privilege escalation allows system-wide disruption. |

---

## 2. Trust Boundaries & Actors

```
[ Untrusted Public Internet ]
           │
═══════════▼═══════════════════════════════════════════════════════════════════
[ Boundary 1: Reverse Proxy & Network Perimeter ] (Nginx, TLS Termination)
═══════════▼═══════════════════════════════════════════════════════════════════
[ Boundary 2: Session Authentication ] (FastAPI HTTP-Only Cookie Session)
           │
           ├───────────────┬─────────────────────────┐
           ▼               ▼                         ▼
   [ Authenticated ]   [ Document Owner ]     [ Administrator ]
   (Collaborator/User)  (Full control over doc) (User/Audit control only)
═══════════▼═══════════════════════════════════════════════════════════════════
[ Boundary 3: Centralized Authorization ] (require_document_access / require_admin)
═══════════▼═══════════════════════════════════════════════════════════════════
[ Boundary 4: Data & Storage Perimeter ] (PostgreSQL 16 & Private Upload Directory)
```

1. **Anonymous Web Users**: Untrusted. Can only access `/api/auth/register`, `/api/auth/login`, and `/api/health`.
2. **Authenticated Users**: Partially trusted. Must be strictly confined to owned or explicitly shared documents.
3. **Collaborators (Read-only / Edit)**: Semi-trusted per document. Cannot delete, cannot manage permissions.
4. **Administrators**: Privileged system operators. **Explicitly constrained**: cannot view or download documents unless explicitly granted access by the owner.
5. **Database / Host OS**: Trusted boundary.

---

## 3. Attack Scenarios, Mitigations & Verification

### Threat 1: Cross-User Document IDOR & Direct Object Reference
- **Scenario**: Attacker (Bob) inspects API requests, discovers UUID of Alice's private document (`/api/documents/{alice_doc_id}`), and issues GET, PATCH, DELETE, or download requests.
- **Mitigation**: Centralized `require_document_access` enforces DB lookup on `(document_id, user_id)` on every single request. Never trusts client-submitted ownership IDs or query parameters.
- **Verification**: `test_bob_cannot_read_alices_document`, `test_bob_cannot_download_alices_document`, `test_bob_cannot_edit_alices_document`, `test_bob_cannot_delete_alices_document` all assert `403 Forbidden`.

### Threat 2: Permission Escalation (Read-only to Edit/Delete)
- **Scenario**: Collaborator granted `read` permission sends a `PATCH` request to modify document metadata, or a `DELETE` request to delete it.
- **Mitigation**: `require_document_access(..., required=PermissionLevel.edit)` checks if granted permission equals `edit`. Deletion and permission changes are strictly guarded by `require_document_owner(doc_id, user, db)` verifying `doc.owner_id == user.id`.
- **Verification**: `test_read_only_cannot_edit` asserts `403 Forbidden`.

### Threat 3: Stale Access Post-Revocation
- **Scenario**: Collaborator's permission is revoked by owner, but collaborator continues accessing document using cached tokens.
- **Mitigation**: TrustVault does not use unrevokable stateless JWTs for document access. Every document request performs a live relational lookup against `document_permissions`. Once deleted in the database transaction, subsequent requests immediately fail.
- **Verification**: `test_revoked_access_blocks_immediately` asserts that immediate request after revocation returns `403 Forbidden`.

### Threat 4: Malicious File Upload & Path Traversal
- **Scenario**: Attacker uploads `../../../etc/passwd` or an executable `.php` file masquerading as a PDF to overwrite server binaries or achieve Remote Code Execution.
- **Mitigation**:
  1. Filename sanitization: Storage filenames are replaced with server-generated random `UUIDv4` strings. The user-supplied filename is never used on disk.
  2. Storage location: Private directory `/storage/uploads/` outside web root, never publicly browsable.
  3. Validation: Extension whitelist (`ALLOWED_EXTENSIONS`), file size limit (`MAX_UPLOAD_BYTES`), and magic number signature validation (first 2048 bytes checked against known signatures).
- **Verification**: `test_path_traversal_in_upload` asserts upload with traversal filename is either rejected or safely stored without `..` in stored filename.

### Threat 5: Administrator Document Snooping
- **Scenario**: System administrator uses their role to read sensitive private documents of company executives without permission.
- **Mitigation**: `require_document_access` does NOT bypass checks for `user.role == admin`. Admins must receive explicit permissions like any other user.
- **Verification**: `test_admin_not_auto_doc_access` asserts that an admin user attempting to access another user's unshared document receives `403 Forbidden`.

### Threat 6: Audit Log Tampering & History Rewriting
- **Scenario**: Insider or attacker modifies an audit log row to cover up unauthorized actions.
- **Mitigation**: Every audit event contains `prev_hash` and `event_hash = SHA256(canonical_json(sequence, actor, action, resource, outcome, timestamp, prev_hash))`. Modifying any historical row breaks the hash chain for all subsequent rows.
- **Verification**: `verify_chain(db)` iterates through sequence order and verifies every SHA-256 hash. Tested via `/api/audit/integrity`.

---

## 4. Residual & Accepted Risks

1. **Client-Side Data Retention After Revocation**:
   - *Risk*: Once a user downloads a document file (`GET /download`), server-side revocation cannot reach into their local hard drive or RAM to delete the saved copy.
   - *Status*: **Accepted Risk**. Inherent to digital files without proprietary hardware-locked Digital Rights Management (DRM). Clearly communicated to owners in the UI.

2. **Full Database Compromise (Superuser Chain Rewrite)**:
   - *Risk*: An attacker with root PostgreSQL privileges could recalculate SHA-256 hashes for an entire rewritten audit table.
   - *Status*: **Accepted Residual Risk**. A database-internal hash chain guarantees detection of single-row inserts/updates/deletions by regular users, but cannot mathematically defend against a full rewrite by a root DB administrator without external write-once storage (WORM) or external ledger anchoring. Documented as design limitation.

3. **Denial of Service via High Concurrency Uploads**:
   - *Risk*: Multiple simultaneous 50MB uploads could saturate disk I/O.
   - *Status*: **Mitigated / Accepted**. Capped by `MAX_UPLOAD_BYTES` (50MB) and reverse-proxy rate limits. Production deployments should attach autoscaling cloud storage.
