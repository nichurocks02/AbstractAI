# app/routes/admin_auth.py

import os
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from itsdangerous import URLSafeSerializer, BadSignature
from datetime import datetime, timezone, timedelta
from fastapi.responses import JSONResponse

router = APIRouter(
    prefix="/admin",
    tags=["AdminAuth"]
)

# Load admin credentials from environment variables (or use defaults)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@otterflow.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "supersecret")

# Session-related settings
ADMIN_SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "admin-session-secret-key")
ADMIN_SESSION_COOKIE = "admin_session_id"
SESSION_EXPIRE_HOURS = 3  # For improved security, sessions expire in 3 hours

# Create a serializer with a fixed salt
serializer = URLSafeSerializer(ADMIN_SESSION_SECRET, salt="admin-session-secret-key")

def create_admin_session_token() -> str:
    """Generate a session token with expiration."""
    exp = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRE_HOURS)
    session_data = {
        "admin": True,
        "exp": exp.timestamp()
    }
    return serializer.dumps(session_data)

def verify_admin_session_token(session_token: str):
    """Verify that the session token is valid and not expired."""
    try:
        data = serializer.loads(session_token)
        if data.get("admin") != True:
            raise HTTPException(status_code=401, detail="Not an admin session")
        if data.get("exp") < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=401, detail="Admin session expired")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid admin session")

def get_current_admin(request: Request):
    """Dependency to protect admin routes."""
    session_token = request.cookies.get(ADMIN_SESSION_COOKIE)
    # Debug print to help ensure the cookie is received
    print("DEBUG: Received admin session cookie:", session_token)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated for admin")
    verify_admin_session_token(session_token)
    return True

def get_admin_user(db: Session = Depends(get_db)) -> User:
    """
    Dependency to retrieve the admin user object.
    Raises 401 if not authorized.
    """
    admin_user = db.query(User).filter(User.is_active == True, User.is_email_verified == True).first()
    if not admin_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authorized")
    return admin_user

@router.post("/login",include_in_schema=False)
async def admin_login(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")

    # Validate credentials against environment variables
    if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        token = create_admin_session_token()
        resp = JSONResponse({"message": "Admin login successful"})
        
        # Since your site will be served over HTTPS via Nginx,
        # we use secure=True, samesite="none", and path="/" so that
        # the cookie is accessible on all routes.
        resp.set_cookie(
            key=ADMIN_SESSION_COOKIE,
            value=token,
            httponly=True,       # Prevent JavaScript access to the cookie
            secure=True,         # Ensure cookie is sent only over HTTPS
            samesite="none",      # Allow cross-site cookie usage if needed
            path="/",            # Cookie is available on all routes
            max_age=SESSION_EXPIRE_HOURS * 3600,
        )
        return resp
    else:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.post("/logout",include_in_schema=False)
async def admin_logout(response: Response):
    """Clear the admin session cookie."""
    resp = JSONResponse({"message": "Admin logout successful"})
    resp.delete_cookie(
        key=ADMIN_SESSION_COOKIE,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    # Add no-cache headers to the response
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    resp.headers["Pragma"] = "no-cache"
    resp.headers["Expires"] = "0"
    return resp

@router.get("/secret-admin-data",include_in_schema=False)
def secret_admin_data(admin: bool = Depends(get_current_admin)):
    """A sample protected admin route."""
    return {"secret": "This is top-secret admin data."}

@router.get("/verify",include_in_schema=False)
def admin_verify(admin: bool = Depends(get_current_admin)):
    """Endpoint to verify admin session."""
    return {"authenticated": True}
