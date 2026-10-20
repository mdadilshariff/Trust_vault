from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.permissions import router as permissions_router
from app.api.audit import router as audit_router
from app.api.admin import router as admin_router

__all__ = ["auth_router", "documents_router", "permissions_router", "audit_router", "admin_router"]
