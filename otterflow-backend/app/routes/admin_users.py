# app/routes/admin_users.py

from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.database import get_db
from app.db.models import User, Wallet
from app.routes.admin_auth import get_current_admin
from fastapi.responses import JSONResponse
import os

router = APIRouter(
    prefix="/admin/users",
    tags=["AdminUsers"]
)

def no_cache_response(content: dict, status_code: int = 200) -> JSONResponse:
    response = JSONResponse(content=content, status_code=status_code)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    return response

# We'll assume a secret key is set in the environment
WALLET_UPDATE_SECRET = os.getenv("WALLET_UPDATE_SECRET", "some-default-key")

@router.get("/",include_in_schema=False)
def list_users(db: Session = Depends(get_db), admin: bool = Depends(get_current_admin)):
    """
    Return a list of all users with basic info:
      - id
      - name
      - email
      - isActive
      - walletBalance
    """
    if not admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    users = db.query(User).all()
    results = []
    for user in users:
        balance = 0.0
        if user.wallet:
            balance = user.wallet.balance/100

        results.append({
            "id": user.id,
            "name": user.name,  # Added user name
            "email": user.email,
            "isActive": "Yes" if user.is_active else "No",
            "walletBalance": f"${balance:.2f}"
        })

    return no_cache_response({"users": results})

@router.get("/{user_id}",include_in_schema=False)
def get_user_detail(user_id: int, db: Session = Depends(get_db), admin: bool = Depends(get_current_admin)):
    """
    Return user details:
      - id
      - name
      - email
      - is_active
      - wallet_balance
    """
    if not admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    balance = user.wallet.balance/100 if user.wallet else 0.0

    data = {
        "id": user.id,
        "name": user.name,         # Return user name
        "email": user.email,
        "is_active": user.is_active,
        "wallet_balance": balance,
    }
    return no_cache_response({"user": data})

@router.put("/{user_id}/balance",include_in_schema=False)
def update_user_balance(
    user_id: int,
    db: Session = Depends(get_db),
    admin: bool = Depends(get_current_admin),
    secret_key: str = Body(..., embed=True, description="Secret key for updating wallet"),
    new_balance: float = Body(..., embed=True, description="New wallet balance")
):
    """
    Update the user's wallet balance, only if the correct secret key is provided.
    Expects JSON body:
    {
      "secret_key": "...",
      "new_balance": 100.0
    }
    """
    if not admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    if secret_key != WALLET_UPDATE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid secret key")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure wallet row exists
    if not user.wallet:
        new_wallet = Wallet(user_id=user.id, balance=0.0)
        db.add(new_wallet)
        db.commit()
        db.refresh(new_wallet)
        user.wallet = new_wallet

    user.wallet.balance = new_balance * 100
    db.commit()
    db.refresh(user.wallet)

    return no_cache_response({
        "message": "Wallet balance updated successfully",
        "user_id": user.id,
        "new_balance": f"${user.wallet.balance:.2f}"
    })
