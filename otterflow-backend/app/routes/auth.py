from fastapi import APIRouter, Depends, Request, HTTPException, Response, status, Body
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi import UploadFile, File
from app.db.models import User, Wallet, OTP
from app.utility.utility import DEFAULT_WALLET_BALANCE, generate_initials_avatar, send_email, hash_password, verify_password, generate_otp
from app.db.database import get_db
import os
import shutil
import requests
from itsdangerous import URLSafeSerializer, BadSignature
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, validator
from passlib.context import CryptContext
import re
import time
router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

# Secret key for signing session tokens
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")

# Session cookie settings
SESSION_COOKIE_NAME = "session_id"
SESSION_COOKIE_MAX_AGE = 60 * 60 * 8 * 1  # 8 hours

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        session_data = serializer.loads(session_token)
        if session_data.get("exp") < datetime.now(timezone.utc).timestamp():
            raise HTTPException(status_code=401, detail="Session expired")

        user_id = session_data.get("user_id")
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")
    
def no_cache_response(content: dict, status_code: int = 200) -> JSONResponse:
    """
    Returns a JSONResponse with no-cache headers.
    Use it for protected routes if you want to ensure the browser doesn't cache.
    """
    response = JSONResponse(content=content, status_code=status_code)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    return response

# Signup endpoint
@router.post("/signup")
async def signup(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")

    if not email or not password or not name:
        raise HTTPException(status_code=400, detail="Email, password, and name are required.")
    
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered.")
    
    hashed_password = hash_password(password)
    new_user = User(
        email=email,
        password=hashed_password,
        name=name,
        auth_method='email'  # Set auth_method to 'email'
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize wallet with $5 free credit
    wallet = Wallet(user_id=new_user.id, balance=DEFAULT_WALLET_BALANCE)
    db.add(wallet)
    db.commit()
    db.refresh(wallet)

    # Generate OTP for email verification
    otp_code = generate_otp()
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)  # OTP valid for 10 minutes
    otp = OTP(
        user_id=new_user.id,
        code=otp_code,
        purpose="email_verification",
        expires_at=otp_expiry
    )
    db.add(otp)
    db.commit()

    # Send OTP email
    subject = "Verify your email for OtterFlow"
    body = f"Hello {name},\n\nYour OTP for email verification is: {otp_code}\nThis OTP is valid for 10 minutes.\n\nThank you!"
    send_email(email, subject, body)

    return JSONResponse(content={"message": "User registered successfully. Please verify your email."}, status_code=201)

# Verify email endpoint
@router.post("/verify-email")
async def verify_email(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    otp_code = data.get("otp")

    if not email or not otp_code:
        raise HTTPException(status_code=400, detail="Email and OTP are required.")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    # Ensure user is using email/password auth
    if user.auth_method != 'email':
        raise HTTPException(status_code=400, detail="Email verification not required for this user.")

    otp = db.query(OTP).filter(
        OTP.user_id == user.id,
        OTP.code == otp_code,
        OTP.purpose == "email_verification",
        OTP.expires_at > datetime.now(timezone.utc)
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    # Mark email as verified
    user.is_email_verified = True
    db.delete(otp)
    db.commit()

    return JSONResponse(content={"message": "Email verified successfully."})

@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    try:
        data = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.") from e

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    if user.auth_method != 'email':
        raise HTTPException(status_code=400, detail="Please log in using Google OAuth.")

    if not verify_password(password, user.password):
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    if not user.is_email_verified:
        raise HTTPException(status_code=400, detail="Email not verified. Please verify your email.")

    # Create a signed session token
    session_token = serializer.dumps({
        "user_id": user.id,
        "exp": (datetime.now(timezone.utc) + timedelta(seconds=SESSION_COOKIE_MAX_AGE)).timestamp()
    })

    print(f"login session cookie name {SESSION_COOKIE_NAME} and {session_token}")

    # Create a single JSONResponse and set the cookie on it
    response = JSONResponse(content={"message": "Logged in successfully."}, status_code=200)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=True,           # True for HTTPS
        samesite="none",
        domain="localhost",    # Explicit domain if needed
        max_age=SESSION_COOKIE_MAX_AGE,
        path="/",
    )
    print(f"Set-Cookie Header: {response.headers.get('set-cookie')}")
    return response


# Forgot password endpoint
@router.post("/forgot-password")
async def forgot_password(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")

    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")

    # Ensure user is using email/password auth
    if user.auth_method != 'email':
        raise HTTPException(status_code=400, detail="Password reset not required for this user.")

    # Generate OTP for password reset
    otp_code = generate_otp()
    otp_expiry = datetime.now(timezone.utc) + timedelta(minutes=10)  # OTP valid for 10 minutes
    otp = OTP(
        user_id=user.id,
        code=otp_code,
        purpose="password_reset",
        expires_at=otp_expiry
    )
    db.add(otp)
    db.commit()

    # Send OTP email
    subject = "Reset your password for OtterFlow"
    body = f"Hello {user.name},\n\nYour OTP for password reset is: {otp_code}\nThis OTP is valid for 10 minutes.\n\nIf you did not request this, please ignore this email."
    send_email(email, subject, body)

    return JSONResponse(content={"message": "Password reset OTP sent to your email."})

# Reset password endpoint
@router.post("/reset-password")
async def reset_password(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    otp_code = data.get("otp")
    new_password = data.get("new_password")

    if not email or not otp_code or not new_password:
        raise HTTPException(status_code=400, detail="Email, OTP, and new password are required.")
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found.")
    
    # Ensure user is using email/password auth
    if user.auth_method != 'email':
        raise HTTPException(status_code=400, detail="Password reset not required for this user.")

    otp = db.query(OTP).filter(
        OTP.user_id == user.id,
        OTP.code == otp_code,
        OTP.purpose == "password_reset",
        OTP.expires_at > datetime.now(timezone.utc)
    ).first()

    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")
    
    # Update the user's password
    user.password = hash_password(new_password)
    db.delete(otp)
    db.commit()

    return JSONResponse(content={"message": "Password reset successfully."})


# LinkedIn OAuth Initiation Endpoint
@router.get("/login/linkedin")
async def login_linkedin():
    """
    Initiates the LinkedIn OAuth flow by redirecting the user to LinkedIn's authorization page.
    """
    linkedin_client_id = os.getenv("LINKEDIN_CLIENT_ID")
    linkedin_redirect_uri = os.getenv("LINKEDIN_REDIRECT_URI")
    linkedin_scope = "r_liteprofile r_emailaddress"  # Requesting basic profile and email
    linkedin_state = secrets.token_urlsafe(16)  # Generate a secure random state

    if not linkedin_client_id or not linkedin_redirect_uri:
        raise HTTPException(status_code=500, detail="LinkedIn OAuth credentials not configured.")

    # Store the state with an expiry (e.g., 10 minutes)
    oauth_states[linkedin_state] = datetime.now(timezone.utc) + timedelta(minutes=10)

    authorization_url = (
        "https://www.linkedin.com/oauth/v2/authorization?"
        f"response_type=code&client_id={linkedin_client_id}&redirect_uri={linkedin_redirect_uri}&"
        f"scope={linkedin_scope}&state={linkedin_state}"
    )

    return RedirectResponse(url=authorization_url)

# LinkedIn OAuth Callback Endpoint
@router.get("/linkedin/callback")
async def linkedin_callback(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Handles the callback from LinkedIn after user authorization.
    Exchanges authorization code for access token, retrieves user info, creates/retrieves user in DB, and sets session cookie.
    """
    code = request.query_params.get("code")
    state = request.query_params.get("state")
    error = request.query_params.get("error")

    if error:
        error_description = request.query_params.get("error_description", "Unknown error")
        raise HTTPException(status_code=400, detail=f"LinkedIn OAuth error: {error_description}")

    if not code or not state:
        raise HTTPException(status_code=400, detail="Authorization code and state are required.")

    # Verify state parameter
    state_expiry = oauth_states.get(state)
    if not state_expiry or state_expiry < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired state parameter.")
    
    # Remove state to prevent reuse
    del oauth_states[state]

    linkedin_client_id = os.getenv("LINKEDIN_CLIENT_ID")
    linkedin_client_secret = os.getenv("LINKEDIN_CLIENT_SECRET")
    linkedin_redirect_uri = os.getenv("LINKEDIN_REDIRECT_URI")

    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    token_data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": linkedin_redirect_uri,
        "client_id": linkedin_client_id,
        "client_secret": linkedin_client_secret,
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }

    try:
        # Exchange authorization code for access token
        token_response = requests.post(token_url, data=token_data, headers=headers)
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        expires_in = token_response.json().get("expires_in")

        if not access_token:
            raise HTTPException(status_code=400, detail="Access token not found in LinkedIn response.")

        # Retrieve user profile information
        profile_url = "https://api.linkedin.com/v2/me"
        email_url = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))"
        profile_headers = {
            "Authorization": f"Bearer {access_token}"
        }

        profile_response = requests.get(profile_url, headers=profile_headers)
        profile_response.raise_for_status()
        profile_data = profile_response.json()

        email_response = requests.get(email_url, headers=profile_headers)
        email_response.raise_for_status()
        email_data = email_response.json()

        first_name = profile_data.get("localizedFirstName")
        last_name = profile_data.get("localizedLastName")
        full_name = f"{first_name} {last_name}"
        email = email_data.get("elements", [{}])[0].get("handle~", {}).get("emailAddress")

        if not email:
            raise HTTPException(status_code=400, detail="Email not found in LinkedIn profile.")

        # Check if user exists
        user = db.query(User).filter(User.email == email).first()

        if not user:
            # Create new user
            user = User(
                email=email,
                name=full_name,
                auth_method='linkedin',
                is_email_verified=True  # Assume LinkedIn email is verified
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Initialize wallet with $5 free credit
            wallet = Wallet(user_id=user.id, balance=DEFAULT_WALLET_BALANCE, email=user.email, name=user.name)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        # Create a signed session token
        session_token = serializer.dumps({
            "user_id": user.id,
            "exp": (datetime.now(timezone.utc) + timedelta(seconds=SESSION_COOKIE_MAX_AGE)).timestamp()
        })

        # Create RedirectResponse to frontend dashboard
        frontend_dashboard_url = os.getenv("FRONTEND_DASHBOARD_URL", "http://localhost:3000/dashboard")
        redirect_response = RedirectResponse(url=frontend_dashboard_url)

        # Set the session cookie
        redirect_response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            httponly=True,
            secure=True,           # Set to True in production with HTTPS
            samesite="none",
            max_age=SESSION_COOKIE_MAX_AGE,
            path="/",
        )

        return redirect_response

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"LinkedIn OAuth error: {str(e)}")


# Google login endpoints already implemented

@router.get("/login/google")
async def login_google():
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    return {
        "url": f"https://accounts.google.com/o/oauth2/auth?prompt=login&response_type=code&client_id={google_client_id}&redirect_uri={google_redirect_uri}&scope=openid%20profile%20email&access_type=offline"
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
            user = User(
                email=user_info["email"],
                name=user_info["name"],
                auth_method='google',  # Set auth_method to 'google'
                is_email_verified=True  # Automatically verified via Google
            )
            db.add(user)
            db.commit()
            db.refresh(user)

            # Initialize wallet with $5 free credit
            wallet = Wallet(user_id=user.id, balance=DEFAULT_WALLET_BALANCE)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        # Create a signed session token
        session_token = serializer.dumps({
            "user_id": user.id,
            "exp": (datetime.now(timezone.utc) + timedelta(seconds=SESSION_COOKIE_MAX_AGE)).timestamp()
        })

        # Create RedirectResponse to frontend dashboard
        frontend_dashboard_url = os.getenv("FRONTEND_DASHBOARD_URL", "http://localhost:3000/dashboard")
        redirect_response = RedirectResponse(url=frontend_dashboard_url)

        # Set the session cookie
        redirect_response.set_cookie(
            key=SESSION_COOKIE_NAME,
            value=session_token,
            httponly=True,
            secure=True,  # Set to True in production with HTTPS
            samesite="none",
            max_age=SESSION_COOKIE_MAX_AGE,
            path="/",
        )


        return redirect_response

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
    
@router.get("/user")
async def get_current_user_route(
    user: User = Depends(get_current_user)  # Re-use the dependency
):
    """
    This route returns the authenticated user's data.
    Also sets no-cache headers.
    """
    response_data = {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar": user.avatar or f"/auth/default-avatar?name={user.name}",
        "auth_method": user.auth_method
    }

    # Now return a JSONResponse with no-cache headers
    response = JSONResponse(content=response_data)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

@router.get("/logout")
async def logout(response: Response):
    response = JSONResponse(content={"message": "Successfully logged out."})
    # Delete with matching domain, samesite, secure, and path
    response.delete_cookie(
        SESSION_COOKIE_NAME,
        path="/",
        domain="localhost",   # Must match the login cookie
        samesite="none",
        secure=True
    )
    # Also ensure no-cache headers
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    return response


@router.get("/default-avatar")
async def default_avatar(name: str):
    svg = generate_initials_avatar(name)
    return Response(content=svg, media_type="image/svg+xml")

class UpdateProfile(BaseModel):
    name: str
@router.post("/upload-avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # Changed from dict to User
):
    user_id = user.id  # Changed from user["id"] to user.id
    user_record = db.query(User).filter(User.id == user_id).first()
    if not user_record:
        raise HTTPException(status_code=404, detail="User not found")

    upload_dir = "uploaded_avatars"
    os.makedirs(upload_dir, exist_ok=True)
    # Prevent filename collision by adding timestamp
    file_extension = os.path.splitext(file.filename)[1]
    new_filename = f"user_{user_id}_{int(time.time())}{file_extension}"
    file_path = os.path.join(upload_dir, new_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user_record.avatar = file_path
    db.commit()
    db.refresh(user_record)

    # Return the avatar URL relative to your frontend
    avatar_url = f"/{file_path}"

    return {"message": "Avatar uploaded successfully", "avatar_url": avatar_url}


@router.post("/update-profile")
async def update_profile(
    profile: UpdateProfile,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # Changed from dict to User
):
    user_id = user.id  # Changed from user["id"] to user.id
    user_record = db.query(User).filter(User.id == user_id).first()
    if not user_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user_record.name = profile.name
    db.commit()
    db.refresh(user_record)
    return {"message": "Profile updated successfully", "name": user_record.name}