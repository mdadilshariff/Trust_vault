from __future__ import annotations

# pyrefly: ignore[missing-import]
from argon2 import PasswordHasher
# pyrefly: ignore[missing-import]
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

_ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4)


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    return _ph.check_needs_rehash(hashed)


def create_session_token(user_id: str) -> str:
    from itsdangerous import URLSafeTimedSerializer
    from app.config import get_settings

    settings = get_settings()
    s = URLSafeTimedSerializer(settings.secret_key, salt="tv-session-token")
    return s.dumps({"user_id": str(user_id)})


def verify_session_token(token: str, max_age: int | None = None) -> str | None:
    from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
    from app.config import get_settings

    settings = get_settings()
    s = URLSafeTimedSerializer(settings.secret_key, salt="tv-session-token")
    try:
        data = s.loads(token, max_age=max_age or settings.session_max_age_seconds)
        return data.get("user_id")
    except (BadSignature, SignatureExpired, Exception):
        return None
