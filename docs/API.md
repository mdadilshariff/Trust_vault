# TrustVault — REST API Specification

TrustVault exposes an OpenAPI 3.0-compliant REST API. Interactive Swagger UI is available at `/api/docs` and ReDoc at `/api/redoc`.

---

## Base Configuration

- **Base URL**: `/api`
- **Authentication**: HTTP-Only Cookie Session (`tv_session` by default)
- **Content Types**: `application/json` (requests & responses), `multipart/form-data` (file uploads), `application/octet-stream` (file downloads)

---

## 1. Authentication Endpoints (`/api/auth`)

### `POST /api/auth/register`
Registers a new user. The first user created automatically receives the `admin` role.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "username": "user123",
    "full_name": "Full Name",
    "password": "StrongPassword123!"
  }
  ```
- **Responses**:
  - `201 Created`: Returns user object.
  - `409 Conflict`: Email or username already in use.
  - `422 Unprocessable Content`: Validation failure (weak password, invalid email format).

### `POST /api/auth/login`
Authenticates credentials using Argon2id. Sets server-validated session cookie upon success.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: Returns authenticated user object and sets HTTP-only session cookie.
  - `401 Unauthorized`: Bad email or password.
  - `403 Forbidden`: Account disabled.

### `POST /api/auth/logout`
Terminates current session, clears cookie, logs audit event.
- **Responses**:
  - `200 OK`: `{"message": "Logged out."}`

### `GET /api/auth/me`
Fetches authenticated user identity.
- **Responses**:
  - `200 OK`: User details.
  - `401 Unauthorized`: No active session.

### `POST /api/auth/change-password`
Updates current user's password using Argon2id rehashing.
- **Request Body**:
  ```json
  {
    "current_password": "OldPassword123!",
    "new_password": "NewStrongPassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: `{"message": "Password updated successfully."}`
  - `400 Bad Request`: Incorrect current password or invalid new password.

---

## 2. Documents Endpoints (`/api/documents`)

### `GET /api/documents`
Lists documents owned by the calling user.
- **Query Parameters**:
  - `page` (default 1), `page_size` (default 20, max 100), `q` (search query), `category` (filter)
- **Responses**:
  - `200 OK`: Paginated list of documents with metadata.

### `GET /api/documents/shared-with-me`
Lists documents shared with the calling user by other owners.
- **Query Parameters**:
  - `page`, `page_size`, `q`
- **Responses**:
  - `200 OK`: Paginated list with attached user permission level (`read` or `edit`).

### `POST /api/documents/upload`
Uploads a document to private storage. Validates file extension, magic signature, and size limit.
- **Form Data**:
  - `file`: Binary file
  - `title`: String (1-255 chars)
  - `description`: String (optional)
  - `category`: String (optional)
- **Responses**:
  - `201 Created`: Document metadata.
  - `400 Bad Request`: Validation failure (unsupported extension, MIME mismatch, magic signature mismatch).
  - `413 Payload Too Large`: Exceeds `MAX_UPLOAD_BYTES` (50MB).

### `GET /api/documents/{id}`
Retrieves document metadata if caller is owner or has read/edit permission.
- **Responses**:
  - `200 OK`: Document metadata.
  - `403 Forbidden`: Caller lacks permission.
  - `404 Not Found`: Document does not exist.

### `GET /api/documents/{id}/download`
Streams file content from private storage using `FileResponse`.
- **Responses**:
  - `200 OK`: File stream (`Content-Disposition: attachment; filename="..."`).
  - `403 Forbidden`: Unauthorized caller.
  - `404 Not Found`: File or document not found.

### `PATCH /api/documents/{id}`
Updates title, description, or category. Caller must be owner or have `edit` permission.
- **Request Body**:
  ```json
  {
    "title": "Updated Title",
    "description": "Updated Description",
    "category": "legal"
  }
  ```
- **Responses**:
  - `200 OK`: Updated document object.
  - `403 Forbidden`: Caller has read-only or no permission.

### `DELETE /api/documents/{id}`
Deletes document record and removes physical file from storage. Caller **must be owner**.
- **Responses**:
  - `204 No Content`: Successful deletion.
  - `403 Forbidden`: Caller is not owner.

---

## 3. Permissions Endpoints (`/api/documents/{id}/permissions`)

### `GET /api/documents/{id}/permissions`
Lists all access grants for the document. Caller **must be owner**.
- **Responses**:
  - `200 OK`: List of permission records.
  - `403 Forbidden`: Non-owner.

### `POST /api/documents/{id}/permissions`
Grants `read` or `edit` permission to a named registered username.
- **Request Body**:
  ```json
  {
    "username": "bob",
    "permission": "read"
  }
  ```
- **Responses**:
  - `201 Created`: Created permission record.
  - `400 Bad Request`: User not found, trying to share with self, or invalid permission.

### `PATCH /api/documents/{id}/permissions/{perm_id}`
Updates existing permission level between `read` and `edit`.
- **Responses**:
  - `200 OK`: Updated permission record.

### `DELETE /api/documents/{id}/permissions/{perm_id}`
Immediately revokes collaborator's access.
- **Responses**:
  - `204 No Content`: Permission revoked.

---

## 4. Audit Endpoints (`/api/audit`)

### `GET /api/audit`
Admin-only endpoint to inspect full system audit stream.
- **Query Parameters**: `page`, `page_size`, `action`, `outcome`
- **Responses**:
  - `200 OK`: Paginated audit events with sequence numbers and cryptographic hashes.
  - `403 Forbidden`: Non-admin.

### `GET /api/audit/my`
Returns caller's personal audit events (logins, uploads, file access).
- **Responses**:
  - `200 OK`: Paginated user audit trail.

### `GET /api/audit/integrity`
Recomputes SHA-256 hash chain across all audit events and validates integrity.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "valid": true,
      "checked": 142
    }
    ```

---

## 5. Admin Endpoints (`/api/admin`)

- `GET /api/admin/stats`: User counts, document counts, storage used, 24h denied attempts.
- `GET /api/admin/users`: User list with role, active status, creation dates.
- `POST /api/admin/users/{id}/status`: Activate or deactivate account.
- `POST /api/admin/users/{id}/role`: Elevate or demote between `admin` and `user`.
- `DELETE /api/admin/users/{id}`: Delete user account (cannot delete own admin account).

---

## 6. System Health

### `GET /api/health`
Health check endpoint used by Docker Compose and reverse proxies.
- **Responses**:
  - `200 OK`: `{"status": "ok", "version": "1.0.0"}`
