# app/routes/__init__.py

from .auth import router as auth_router
from .wallet import router as wallet_router
from .api_keys import router as api_keys_router
from .queries import router as queries_router

__all__ = ["auth_router", "wallet_router", "api_keys_router", "queries_router"]
