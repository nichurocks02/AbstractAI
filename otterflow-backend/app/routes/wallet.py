# app/routes/wallet.py

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.models import User, Wallet
from app.db.database import get_db
from app.routes.auth import get_current_user, no_cache_response
import stripe
import os

router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"]
)

@router.get("/balance",include_in_schema=False)
async def get_wallet_balance(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # Use centralized dependency
):
    wallet_balance = user.wallet.balance if user.wallet else 0
    return no_cache_response({"wallet_balance": wallet_balance})

@router.post("/recharge",include_in_schema=False)
async def recharge_wallet(
    amount: int,
    request: Request,  # Needed to access the request body
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # Use centralized dependency
):
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

        return no_cache_response({
            "message": "Wallet recharge successful",
            "wallet_balance": wallet.balance
        })

    except stripe.error.StripeError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Payment failed: {str(e)}")
