# app/routes/auth.py

from fastapi import APIRouter, Depends, Request, HTTPException, Response
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
from fastapi.responses import JSONResponse
from fastapi import UploadFile, File, HTTPException
from app.db.models import User, Wallet
from app.utility.utility import DEFAULT_WALLET_BALANCE, generate_initials_avatar
from app.db.database import get_db
import os
import shutil
import requests
from itsdangerous import URLSafeSerializer, BadSignature
from datetime import datetime, timezone, timedelta



router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# Secret key for signing session tokens
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")

# Session cookie settings
SESSION_COOKIE_NAME = "session_id"
SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days



@router.get("/login/google")
async def login_google():
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    return {
        "url": f"https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={google_client_id}&redirect_uri={google_redirect_uri}&scope=openid%20profile%20email&access_type=offline"
    }

@router.get("/google")
async def auth_google(code: str, request: Request, response: Response, db: Session = Depends(get_db)):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    token_url = "https://accounts.google.com/o/oauth2/token"
    data = {
        "code": code,
        "client_id": google_client_id,
        "client_secret": google_client_secret,
        "redirect_uri": google_redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        token_response = requests.post(token_url, data=data)
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token not received")

        user_info_response = requests.get(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_info_response.raise_for_status()
        user_info = user_info_response.json()

        # Check if the user exists, otherwise create one and assign free credit
        user = db.query(User).filter_by(email=user_info["email"]).first()

        if not user:
            # Create a new user
            user = User(email=user_info["email"], name=user_info["name"])
            db.add(user)
            db.commit()
            db.refresh(user)

            # Initialize wallet with $5 free credit
            wallet = Wallet(user_id=user.id, balance=DEFAULT_WALLET_BALANCE)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        # Create a signed session token
        session_token = serializer.dumps({"user_id": user.id, "exp": (datetime.now(timezone.utc) + timedelta(seconds=SESSION_COOKIE_MAX_AGE)).timestamp()})

        # Create RedirectResponse to frontend dashboard
        frontend_dashboard_url = os.getenv("FRONTEND_DASHBOARD_URL", "http://localhost:3000/dashboard")
        redirect_response = RedirectResponse(url=frontend_dashboard_url)

        # Set the session cookie
        redirect_response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            httponly=True,
            secure=False,  # Set to True in production with HTTPS
            samesite="lax",
            max_age=SESSION_COOKIE_MAX_AGE,
            path="/",
        )

        return redirect_response

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/user")
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        session_data = serializer.loads(session_token)
        # Check for expiration
        if session_data.get("exp") < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=401, detail="Session expired")

        user_id = session_data.get("user_id")
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return {
                "id": user.id, 
                "email": user.email, 
                "name": user.name,
                "avatar": user.avatar or f"/auth/default-avatar?name={user.name}",
                }

    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

@router.get("/logout")
async def logout(response: Response):
    # Optionally, you can include the frontend login URL in the response if needed
    # frontend_login_url = os.getenv("FRONTEND_LOGIN_URL", "http://localhost:3000/auth")
    response = JSONResponse(content={"message": "Successfully logged out."})
    response.delete_cookie(SESSION_COOKIE_NAME, path="/")
    return response


@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    user_id = user["id"]  # Extract the ID from the user dictionary
    user_record = db.query(User).filter(User.id == user_id).first()
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    upload_dir = "uploaded_avatars"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user_record.avatar = file_path
    db.commit()
    return {"message": "Avatar uploaded successfully", "avatar_url": file_path}


@router.get("/default-avatar/")
async def default_avatar(name: str):
    svg = generate_initials_avatar(name)
    return Response(content=svg, media_type="image/svg+xml")

