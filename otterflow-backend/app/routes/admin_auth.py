# app/routes/admin_auth.py

import os
from fastapi import APIRouter, Request, Response, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from itsdangerous import URLSafeSerializer, BadSignature
from datetime import datetime, timezone, timedelta
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

router = APIRouter(
    prefix="/admin",
    tags=["AdminAuth"]
)

# Load admin credentials from .env or environment variables
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@otterflow.com")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "supersecret")

# Session-related
ADMIN_SESSION_SECRET = os.getenv("ADMIN_SESSION_SECRET", "admin-session-secret-key")
ADMIN_SESSION_COOKIE = "admin_session_id"
SESSION_EXPIRE_HOURS = 3  # shorter for better security

serializer = URLSafeSerializer(ADMIN_SESSION_SECRET, salt="admin-session")

def create_admin_session_token() -> str:
    """Generate a session token with expiration."""
    exp = datetime.now(timezone.utc) + timedelta(hours=SESSION_EXPIRE_HOURS)
    session_data = {
        "admin": True,
        "exp": exp.timestamp()
    }
    return serializer.dumps(session_data)

def verify_admin_session_token(session_token: str):
    """Verify the session token is valid and not expired."""
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
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated for admin")
    verify_admin_session_token(session_token)
    # If we get here, token is valid. Return True or some admin object if needed.
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

@router.post("/login")
async def admin_login(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")

    # Validate against env credentials
    if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
        token = create_admin_session_token()
        response = JSONResponse({"message": "Admin login successful"})
        
        # Determine if we're in production
        ENV = os.getenv("ENV", "development")
        secure_flag = True if ENV == "production" else False

        response.set_cookie(
            key=ADMIN_SESSION_COOKIE,
            value=token,
            httponly=True,           # disallow JavaScript access
            secure=secure_flag,      # set True in production (HTTPS)
            samesite="strict",      
            path="/",
            max_age=SESSION_EXPIRE_HOURS * 3600,
        )
        return response
    else:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

@router.post("/logout")
async def admin_logout(response: Response):
    """Clear the admin session cookie."""
    response = JSONResponse({"message": "Admin logout successful"})
    
    # Determine if we're in production
    ENV = os.getenv("ENV", "development")
    secure_flag = True if ENV == "production" else False

    response.delete_cookie(
        key=ADMIN_SESSION_COOKIE,
        httponly=True,             
        secure=secure_flag,               
        samesite="strict",         
        path="/"                   
    )
    # Also ensure no-cache headers
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    return response

# Example protected route
@router.get("/secret-admin-data")
def secret_admin_data(admin: bool = Depends(get_current_admin)):
    """Any route that depends on get_current_admin is admin-protected."""
    return {"secret": "This is top-secret admin data."}

@router.get("/verify")
def admin_verify(admin: bool = Depends(get_current_admin)):
    """Endpoint to verify admin session."""
    return {"authenticated": True}
