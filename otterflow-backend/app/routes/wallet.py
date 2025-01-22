from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.models import User, Wallet
from app.db.database import get_db
from itsdangerous import URLSafeSerializer, BadSignature
from datetime import datetime, timezone, timedelta
import stripe
import os

router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"]
)

# Shared session setup (should match your auth.py settings)
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")
SESSION_COOKIE_NAME = "session_id"
SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days

# Helper function to get the current authenticated user
def get_current_user_from_request(request: Request, db: Session) -> User:
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session_data = serializer.loads(session_token)
        user_id = session_data.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid session")
        user = db.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")

@router.get("/balance")
async def get_wallet_balance(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)
    wallet_balance = user.wallet.balance if user.wallet else 0
    return {"wallet_balance": wallet_balance}

@router.post("/recharge")
async def recharge_wallet(amount: int, request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_request(request, db)

    wallet = user.wallet
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")

    body = await request.json()
    token = body.get("token")

    if not token:
        raise HTTPException(status_code=400, detail="Payment token is missing")

    try:
        # Charge the user (amount should be in cents)
        charge = stripe.Charge.create(
            amount=amount * 100,  # Convert dollars to cents
            currency="usd",
            source=token,
            description=f"Wallet recharge for {user.name}"
        )

        # Update wallet balance after successful payment
        wallet.balance += amount * 100
        db.commit()

        return {"message": "Wallet recharge successful", "wallet_balance": wallet.balance}

    except stripe.error.StripeError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Payment failed: {str(e)}")
