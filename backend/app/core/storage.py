from __future__ import annotations

import hashlib
import os
import re
import uuid
from pathlib import Path

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

settings = get_settings()

# File-signature magic bytes for common types
_MAGIC: dict[str, list[bytes]] = {
    "pdf":  [b"%PDF"],
    "png":  [b"\x89PNG\r\n\x1a\n"],
    "jpg":  [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "gif":  [b"GIF87a", b"GIF89a"],
    "zip":  [b"PK\x03\x04"],
    "docx": [b"PK\x03\x04"],
    "xlsx": [b"PK\x03\x04"],
    "pptx": [b"PK\x03\x04"],
}

_SAFE_FILENAME_RE = re.compile(r"[^\w\-.]")


def _safe_ext(filename: str) -> str:
    """Return lowercase extension without the dot, or empty string."""
    return Path(filename).suffix.lstrip(".").lower()


def _safe_stem(filename: str) -> str:
    stem = Path(filename).stem
    return _SAFE_FILENAME_RE.sub("_", stem)[:64]


def generate_stored_filename(original: str) -> str:
    """UUID-based stored name prevents path traversal and collisions."""
    ext = _safe_ext(original)
    return f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex


def validate_extension(filename: str) -> str:
    ext = _safe_ext(filename)
    if ext not in settings.allowed_ext_set:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type '.{ext}' is not allowed.",
        )
    return ext


async def validate_and_store(upload: UploadFile) -> tuple[str, str, int, str]:
    """
    Validate size, extension, and magic bytes, then write to private storage.
    Returns (stored_filename, mime_type, size_bytes, extension).
    """
    ext = validate_extension(upload.filename or "")

    upload_path = Path(settings.upload_dir).resolve()
    upload_path.mkdir(parents=True, exist_ok=True)

    stored_name = generate_stored_filename(upload.filename or "file")
    dest = upload_path / stored_name

    # Prevent path traversal (paranoia — UUID name already safe)
    if not str(dest).startswith(str(upload_path)):
        raise HTTPException(status_code=400, detail="Invalid file path.")

    total = 0
    header = b""
    first_chunk = True

    async with aiofiles.open(dest, "wb") as out:
        while True:
            chunk = await upload.read(65_536)
            if not chunk:
                break
            total += len(chunk)
            if total > settings.max_upload_bytes:
                await out.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds {settings.max_upload_bytes // 1_048_576} MB limit.",
                )
            if first_chunk:
                header = chunk[:16]
                first_chunk = False
            await out.write(chunk)

    # Magic-byte validation
    if ext in _MAGIC:
        allowed_sigs = _MAGIC[ext]
        if not any(header.startswith(sig) for sig in allowed_sigs):
            dest.unlink(missing_ok=True)
            raise HTTPException(
                status_code=422,
                detail=f"File content does not match the '{ext}' extension.",
            )

    mime = upload.content_type or "application/octet-stream"
    return stored_name, mime, total, ext


def get_file_path(stored_filename: str) -> Path:
    """Return absolute path; raises 404 if file not found."""
    # Guard against path traversal in stored_filename
    safe = Path(stored_filename).name
    path = Path(settings.upload_dir).resolve() / safe
    if not path.exists():
        raise HTTPException(status_code=404, detail="File not found.")
    return path


def delete_stored_file(stored_filename: str) -> None:
    safe = Path(stored_filename).name
    path = Path(settings.upload_dir).resolve() / safe
    path.unlink(missing_ok=True)
