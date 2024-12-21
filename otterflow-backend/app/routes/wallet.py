# app/routes/wallet.py

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.models import User, Wallet
from app.db.database import get_db
import stripe

router = APIRouter(
    prefix="/wallet",
    tags=["Wallet"]
)

@router.post("/recharge")
async def recharge_wallet(amount: int, request: Request, db: Session = Depends(get_db)):
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

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
            amount=amount * 100,  # amount in cents
            currency="usd",
            source=token,
            description=f"Wallet recharge for {user.name}"
        )

        # Update wallet balance after successful payment
        wallet.balance += amount * 100
        db.commit()

        return {"message": "Wallet recharge successful", "wallet_balance": wallet.balance}

    except stripe.error.StripeError as e:
        db.rollback()  # Rollback on Stripe error
        raise HTTPException(status_code=400, detail=f"Payment failed: {str(e)}")

@router.get("/balance")
async def get_wallet_balance(request: Request, db: Session = Depends(get_db)):
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet_balance = user.wallet.balance if user.wallet else 0
    return {"wallet_balance": wallet_balance}
