from fastapi import APIRouter, Depends, Request, HTTPException, Response, status
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


# Signup endpoint
@router.post("/signup")
async def signup(request: Request, response: Response, db: Session = Depends(get_db)):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name")
    company = data.get("company")  # Optional

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

# Google login endpoints already implemented

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
async def get_current_user(request: Request, db: Session = Depends(get_db)):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    print(f" the session cookie is :{session_token}")
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

