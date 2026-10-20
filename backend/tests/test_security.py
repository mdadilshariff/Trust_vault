"""
Security tests — IDOR, cross-user access, revocation, path traversal.
Also includes isolated mutation test that proves the auth check matters.
"""
from __future__ import annotations

import io
import uuid
import pytest

from tests.conftest import make_pdf_bytes, fake_upload


# ── Helper ─────────────────────────────────────────────────────────────────────

async def upload_doc(client, cookies, title="Test Doc"):
    r = await client.post(
        "/api/documents/upload",
        data={"title": title, "category": "test"},
        files=fake_upload(),
        cookies=cookies,
    )
    assert r.status_code == 201, r.text
    return r.json()


# ── Cross-user IDOR ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_bob_cannot_read_alices_document(client, alice_token, bob_token):
    """Bob must NOT be able to read Alice's private document."""
    doc = await upload_doc(client, alice_token, "Alice Private Doc")
    doc_id = doc["id"]

    r = await client.get(f"/api/documents/{doc_id}", cookies=bob_token)
    assert r.status_code == 403, f"Expected 403, got {r.status_code}"


@pytest.mark.asyncio
async def test_bob_cannot_download_alices_document(client, alice_token, bob_token):
    doc = await upload_doc(client, alice_token, "Alice Download Guard")
    r = await client.get(f"/api/documents/{doc['id']}/download", cookies=bob_token)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_bob_cannot_edit_alices_document(client, alice_token, bob_token):
    doc = await upload_doc(client, alice_token, "Alice Edit Guard")
    r = await client.patch(
        f"/api/documents/{doc['id']}",
        json={"title": "Hacked"},
        cookies=bob_token,
    )
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_bob_cannot_delete_alices_document(client, alice_token, bob_token):
    doc = await upload_doc(client, alice_token, "Alice Delete Guard")
    r = await client.delete(f"/api/documents/{doc['id']}", cookies=bob_token)
    assert r.status_code == 403


# ── Permission escalation ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_read_only_cannot_edit(client, alice_token, bob_token):
    """Bob has read-only; must not be able to edit."""
    doc = await upload_doc(client, alice_token, "Read Only Doc")
    doc_id = doc["id"]

    # Grant read to bob
    r = await client.post(
        f"/api/documents/{doc_id}/permissions",
        json={"username": "bob", "permission": "read"},
        cookies=alice_token,
    )
    assert r.status_code == 201

    r2 = await client.patch(
        f"/api/documents/{doc_id}",
        json={"title": "Bob Edited"},
        cookies=bob_token,
    )
    assert r2.status_code == 403


# ── Revocation ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_revoked_access_blocks_immediately(client, alice_token, bob_token):
    doc = await upload_doc(client, alice_token, "Revocation Test Doc")
    doc_id = doc["id"]

    # Grant
    r = await client.post(
        f"/api/documents/{doc_id}/permissions",
        json={"username": "bob", "permission": "read"},
        cookies=alice_token,
    )
    assert r.status_code == 201
    perm_id = r.json()["id"]

    # Verify access
    r2 = await client.get(f"/api/documents/{doc_id}", cookies=bob_token)
    assert r2.status_code == 200

    # Revoke
    r3 = await client.delete(
        f"/api/documents/{doc_id}/permissions/{perm_id}",
        cookies=alice_token,
    )
    assert r3.status_code == 204

    # Should now be denied
    r4 = await client.get(f"/api/documents/{doc_id}", cookies=bob_token)
    assert r4.status_code == 403


# ── Permission management by non-owner ────────────────────────────────────────

@pytest.mark.asyncio
async def test_bob_cannot_manage_permissions(client, alice_token, bob_token):
    doc = await upload_doc(client, alice_token, "Permission Guard Doc")
    r = await client.get(
        f"/api/documents/{doc['id']}/permissions",
        cookies=bob_token,
    )
    assert r.status_code == 403


# ── Unauthenticated access ─────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unauthenticated_cannot_list_documents(client):
    r = await client.get("/api/documents")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_unauthenticated_cannot_upload(client):
    r = await client.post(
        "/api/documents/upload",
        data={"title": "Test"},
        files=fake_upload(),
    )
    assert r.status_code == 401


# ── Path traversal ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_path_traversal_in_upload(client, alice_token):
    r = await client.post(
        "/api/documents/upload",
        data={"title": "Traversal Test"},
        files={"file": ("../../../etc/passwd", io.BytesIO(b"%PDF-fake"), "text/plain")},
        cookies=alice_token,
    )
    # Either rejects the extension or stores safely (UUID name)
    # The important thing: the stored_filename must not contain ".."
    if r.status_code == 201:
        stored = r.json().get("stored_filename", "")
        assert ".." not in stored


# ── Admin cannot auto-access documents ────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_not_auto_doc_access(client, alice_token, bob_token):
    """
    Admin user (alice) should NOT automatically access non-shared documents uploaded by bob.
    Admin privileges are for user/audit management only, not universal document access.
    """
    doc = await upload_doc(client, bob_token, "Bob Private Document")
    r = await client.get(f"/api/documents/{doc['id']}", cookies=alice_token)
    assert r.status_code == 403, f"Admin should receive 403 on unshared doc, got {r.status_code}"


# ── ISOLATED MUTATION TEST ─────────────────────────────────────────────────────
#
# This test creates a PATCHED version of require_document_access (with the
# authorization check disabled) as a test-only fixture and proves that WITHOUT
# the check, Bob CAN access Alice's document — demonstrating the check is
# genuinely enforced and necessary.

@pytest.mark.asyncio
async def test_mutation_authorization_check_is_necessary(client, alice_token, bob_token):
    """
    Mutation test: temporarily replace require_document_access with a version
    that skips the permission check. The subsequent request from Bob should
    succeed (200), proving that the real check in production prevents the access.

    The actual production code is NEVER modified.
    """
    from app.core import authorization as auth_module
    from app.models.document import Document
    from sqlalchemy import select

    doc = await upload_doc(client, alice_token, "Mutation Test Doc")
    doc_id = doc["id"]

    # Verify Bob is currently denied
    r_before = await client.get(f"/api/documents/{doc_id}", cookies=bob_token)
    assert r_before.status_code == 403, "Pre-condition: Bob should be denied"

    # --- Patch: bypass authorization ---
    original_fn = auth_module.require_document_access

    async def _no_auth_check(document_id, user, db, required=None):
        """Mutant: skips permission check entirely."""
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            from fastapi import HTTPException
            raise HTTPException(status_code=404)
        return doc

    # Apply mutation to the documents module's reference
    import app.api.documents as docs_module
    original_ref = docs_module.require_document_access
    docs_module.require_document_access = _no_auth_check

    try:
        r_mutant = await client.get(f"/api/documents/{doc_id}", cookies=bob_token)
        # With auth check disabled, Bob should now get 200
        assert r_mutant.status_code == 200, (
            f"Mutation test failed: expected 200 with auth disabled, got {r_mutant.status_code}. "
            "This means the authorization check was not the only guard — investigate."
        )
    finally:
        # Always restore production code
        docs_module.require_document_access = original_ref

    # Confirm production behavior is restored
    r_after = await client.get(f"/api/documents/{doc_id}", cookies=bob_token)
    assert r_after.status_code == 403, "Post-mutation: production check should be restored"
