# app/routes/auth.py

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.models import User, Wallet
from app.utility.utility import DEFAULT_WALLET_BALANCE
from app.db.database import get_db  # We'll create this shortly
import os
import requests

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

@router.get("/login/google")
async def login_google():
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    return {
        "url": f"https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={google_client_id}&redirect_uri={google_redirect_uri}&scope=openid%20profile%20email&access_type=offline"
    }

@router.get("/google")
async def auth_google(code: str, request: Request, db: Session = Depends(get_db)):
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
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        access_token = response.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token not received")
        user_info = requests.get(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_info.raise_for_status()
        user_info = user_info.json()

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

        # Store user session using application state
        request.app.state.session_store[request.client.host] = user.id

        return {"message": "Login successful", "user": user_info}

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")
