# TrustVault — Permissions & Authorization Matrix

This document specifies the authorization model, role definitions, granular document permissions, and revocation semantics implemented in TrustVault.

---

## 1. Role Hierarchy & Responsibilities

TrustVault distinguishes between **system-level administrative roles** and **per-resource (document-level) permissions**.

| Role / Subject | Scope | Capabilities | Constraints |
|---|---|---|---|
| **Administrator** | System-wide | Manage user accounts (activate/deactivate, role toggle, delete); inspect global audit event stream; verify cryptographic audit hash chain. | **Cannot** access, view, or download documents unless explicitly granted by the document owner or if the administrator is the owner. |
| **Document Owner** | Per Document | View, download, update metadata, delete document, grant permissions to named registered users, update permissions, revoke permissions. | Full sovereign control over the document lifecycle. |
| **Collaborator (Edit)** | Per Document | View document metadata, download file content, update metadata (title, description, category). | **Cannot** delete the document, grant permissions, or alter permissions of other users. |
| **Viewer (Read)** | Per Document | View document metadata, download file content. | **Cannot** edit metadata, cannot delete, cannot grant or alter permissions. |
| **Unauthorized User** | Global / Unshared | No access. | Every document operation returns `403 Forbidden`. Requests without active session return `401 Unauthorized`. |

---

## 2. Granular Permission Matrix

| Operation | HTTP Endpoint | Owner | Edit Permission | Read Permission | Admin (Non-owner) | Other Registered | Unauthenticated |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **List Own Docs** | `GET /api/documents` |  |  |  |  (own only) |  (own only) |  401 |
| **List Shared Docs** | `GET /api/documents/shared-with-me` |  |  |  |  |  |  401 |
| **View Metadata** | `GET /api/documents/{id}` |  |  |  |  403 |  403 |  401 |
| **Download File** | `GET /api/documents/{id}/download` |  |  |  |  403 |  403 |  401 |
| **Edit Metadata** | `PATCH /api/documents/{id}` |  |  |  403 |  403 |  403 |  401 |
| **Delete Document** | `DELETE /api/documents/{id}` |  |  403 |  403 |  403 |  403 |  401 |
| **List Permissions** | `GET /api/documents/{id}/permissions` |  |  403 |  403 |  403 |  403 |  401 |
| **Grant Permission** | `POST /api/documents/{id}/permissions` |  |  403 |  403 |  403 |  403 |  401 |
| **Modify Permission**| `PATCH /api/documents/{id}/permissions/{perm_id}` |  |  403 |  403 |  403 |  403 |  401 |
| **Revoke Access** | `DELETE /api/documents/{id}/permissions/{perm_id}` |  |  403 |  403 |  403 |  403 |  401 |
| **Inspect System Audit**| `GET /api/audit` |  403 |  403 |  403 |  |  403 |  401 |
| **User Management** | `GET/POST /api/admin/*` |  403 |  403 |  403 |  |  403 |  401 |

---

## 3. Centralized Enforcement Architecture

Authorization in TrustVault is centralized in `backend/app/core/authorization.py`:

1. **Every protected route** executes `get_current_user` dependency to validate session cookie against PostgreSQL session data.
2. Document operations invoke `require_document_access(document_id, user, db, required_level)`:
   - First verifies document existence via `get_document_or_404` (returns 404 if not found).
   - If `doc.owner_id == user.id`, grants access immediately.
   - Queries `document_permissions` table for matching `(document_id, user_id)`.
   - If no row found, raises `HTTP 403 Forbidden` ("Access denied.").
   - If required level is `edit` and record is `read`, raises `HTTP 403 Forbidden` ("Edit permission required.").
3. Administrative routes invoke `require_admin(user)` which verifies `user.role == UserRole.admin`.

**Never trust client state**: UI buttons and navigation guards are purely ergonomic. Backend authorization operates independently on every single request.

---

## 4. Revocation Semantics & Guarantees

### Immediate Effect
When a document owner calls `DELETE /api/documents/{id}/permissions/{perm_id}`:
- The permission record is deleted within a database transaction and committed.
- An audit event `permission.revoke` is written to the cryptographic hash chain.
- Because permissions are queried live from the database on every subsequent request (no stale JWT caching or token blacklists), **revocation takes effect immediately**.
- The next request made by the collaborator for document metadata, download, or edit will fail with `HTTP 403 Forbidden`.

### Downloaded Copies Disclaimer
> [!IMPORTANT]
> **Client-Side Limitation**: Once a collaborator has downloaded a file to their local filesystem, the server cannot remotely wipe or destroy that local copy. Revocation guarantees that no further downloads, updates, or API interactions with that document can occur via TrustVault. This boundary is explicitly disclosed in the user interface and threat documentation.
