# app/routes/api_keys.py

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.models import User, APIKey
from app.db.database import get_db
from app.utility.utility import generate_unique_api_key, cost_per_query
from app.routes.auth import get_current_user, no_cache_response
from datetime import datetime
from pydantic import BaseModel
from itsdangerous import URLSafeSerializer, BadSignature
import os
router = APIRouter(
    prefix="/api-key",
    tags=["API Keys"]
)

# Secret key for signing session tokens
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")

# Session cookie settings
SESSION_COOKIE_NAME = "session_id"



class APIKeyRequest(BaseModel):
    api_name: str
    
# Pydantic model for APIKey output
class APIKeyOut(BaseModel):
    key: str
    api_name: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

@router.post("/generate_api_key",include_in_schema=False)
async def generate_api_key(
    request_body: APIKeyRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),  # <-- session validation
):
    # user is guaranteed valid from get_current_user
    api_name = request_body.api_name

    wallet = user.wallet
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")

    if wallet.balance < 100:  # $1.00 in cents
        raise HTTPException(status_code=400, detail="Insufficient balance in wallet")

    existing_api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()
    if existing_api_key:
        raise HTTPException(status_code=400, detail="API name already exists for this user")

    api_key_value = generate_unique_api_key()
    api_key = APIKey(
        key=api_key_value,
        user_id=user.id,
        api_name=api_name,
        is_active=True,
        created_at=datetime.utcnow()
    )

    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return {"api_key": api_key_value, "status": "active", "wallet_balance": wallet.balance}

@router.put("/{api_name}/status",include_in_schema=False)
async def update_api_key_status(api_name: str, is_active: bool, db: Session = Depends(get_db),
    user: User = Depends(get_current_user)):
    
    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    if is_active and user.wallet.balance < 0:
        raise HTTPException(status_code=402, detail="Insufficient wallet balance to activate the API key")

    api_key.is_active = is_active
    db.commit()

    return {"message": f"API key status updated to {'active' if is_active else 'inactive'}"}

@router.delete("/{api_name}/delete",include_in_schema=False)
async def delete_api_key(api_name: str, db: Session = Depends(get_db),
    user: User = Depends(get_current_user)):
    
    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    db.delete(api_key)
    db.commit()

    return {"message": "API key deleted"}

@router.get("/list",include_in_schema=False)
async def list_api_keys(db: Session = Depends(get_db),
    user: User = Depends(get_current_user)):
    
    api_keys = db.query(APIKey).filter_by(user_id=user.id).all()
    if not api_keys:
        raise HTTPException(status_code=404, detail="No API keys found for this user")

    return {"api_keys": [APIKeyOut.from_orm(k) for k in api_keys], "wallet_balance": user.wallet.balance}