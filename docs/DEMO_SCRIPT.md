# TrustVault — 5-Minute Demonstration Script

This script provides an exact step-by-step walkthrough to demonstrate all core capabilities, security controls, immediate revocation, audit chain verification, and test execution for judges and stakeholders.

---

## Preparation (Pre-Demo Setup)

1. Start application:
   ```bash
   docker compose up -d
   ```
2. Open browser to `http://localhost:5173`.
3. Open two separate browser profiles (or an Incognito window):
   - **Window A (Owner)**: `alice@trustvault.dev`
   - **Window B (Collaborator & Admin)**: `bob@trustvault.dev` / `admin@trustvault.dev`

---

## Step 1: Authentication & User Dashboard (0:00 – 0:45)

1. In **Window A**, log in as `alice@trustvault.dev` (password: `Alice1234!`).
2. Show the Dashboard:
   - Clean dark-navy / slate security product UI.
   - Real database stats: Document count, shared documents, recent user activity stream.
   - Emphasize session security: HTTP-only cookies, Argon2id password hashing.

---

## Step 2: Upload Private Document (0:45 – 1:30)

1. Navigate to **Upload** (`/upload`).
2. Select a PDF file (e.g. `quarterly_financials.pdf`), title it *"Q3 Financial Report"*, set category to *Finance*.
3. Click **Upload Document**:
   - Explain server-side validation: MIME type detection, magic byte header verification, safe UUID storage path.
   - Show document appears instantly in **My Documents** (`/documents`).
   - Click document to open **Document Details** (`/documents/{id}`).

---

## Step 3: Granular Sharing with Collaborator (1:30 – 2:15)

1. On the document detail page, scroll to **Permissions & Sharing**.
2. Type username `bob` and select permission **Read Only**.
3. Click **Grant Access**:
   - Permission record is created and displayed in the active collaborator list.
   - Audit trail registers `permission.grant` event.

---

## Step 4: Collaborator Access & Permission Enforcement (2:15 – 3:00)

1. In **Window B**, log in as `bob@trustvault.dev` (password: `Bob12345!`).
2. Click **Shared With Me** in the sidebar:
   - Bob sees *"Q3 Financial Report"* with badge `Read Only`.
3. Click the document to view details:
   - Bob can view metadata and click **Download Document** to stream the file.
4. **Attempt Unauthorized Edit**:
   - Bob attempts to edit the title to *"Hacked Title"*.
   - Notice the Save button is disabled in the UI, and if sent via API, backend responds with `403 Forbidden` (`Edit permission required`).
   - Bob has **no Delete button** and cannot see or alter the permissions list.

---

## Step 5: Immediate Revocation & Blocked Access (3:00 – 3:45)

1. Switch back to **Window A (Alice)** on the document detail page.
2. In the Permissions table, click **Revoke** next to Bob's row and confirm.
   - Permission is removed immediately from the database.
   - Notice the UI limitation callout: *"Revocation immediately prevents further downloads and updates, but cannot erase copies Bob has already saved locally."*
3. Switch to **Window B (Bob)**:
   - Bob refreshes the page or clicks download again.
   - **Result**: Bob immediately receives `403 Forbidden` ("Access denied.")!
   - Navigate back to **Shared With Me**: the document is completely gone.

---

## Step 6: Administrator Audit Review & Hash-Chain Verification (3:45 – 4:30)

1. In **Window B**, log out as Bob and log in as `admin@trustvault.dev` (password: `Admin1234!`).
2. Show the **Admin Dashboard** (`/admin`):
   - Real metrics: total registered users, documents in system, denied access attempts in last 24 hours.
   - Point out that **Admin cannot read Alice's documents** (isolation enforced!).
3. Navigate to **Audit Trail** (`/audit`):
   - Review live chronological audit stream: login attempts, file uploads, permission grants, and immediate revocation events.
4. Navigate to **Audit Integrity** (`/audit/integrity`):
   - Click **Run Integrity Verification**.
   - Show real-time SHA-256 chain recalculation: *"Audit Chain Valid: 100% verified across all sequence entries."*

---

## Step 7: Automated Tests & Mutation Test Execution (4:30 – 5:00)

1. Open terminal in workspace root and run:
   ```bash
   pytest backend -v
   ```
2. Highlight results:
   - 18 passed in under 1 second.
   - Highlight `test_mutation_authorization_check_is_necessary`: proves that dynamically stripping the permission check causes Bob's unauthorized access test to fail, confirming the authorization layer is strictly mandatory and live.
3. Conclude demonstration.
