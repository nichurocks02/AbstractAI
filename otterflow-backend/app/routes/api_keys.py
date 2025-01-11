# app/routes/api_keys.py

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.models import User, APIKey
from app.db.database import get_db
from app.utility.utility import generate_unique_api_key, cost_per_query
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

def get_current_user_from_cookie(request: Request, db: Session):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session_data = serializer.loads(session_token)
        user_id = session_data.get("user_id")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user
@router.post("/generate_api_key")
async def generate_api_key(
    request_body: APIKeyRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    user = get_current_user_from_cookie(request, db)
    api_name = request_body.api_name  # Extract from JSON body

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

@router.put("/{api_name}/status")
async def update_api_key_status(api_name: str, is_active: bool, request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_cookie(request, db)

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    if is_active and user.wallet.balance < 0:
        raise HTTPException(status_code=402, detail="Insufficient wallet balance to activate the API key")

    api_key.is_active = is_active
    db.commit()

    return {"message": f"API key status updated to {'active' if is_active else 'inactive'}"}

@router.delete("/{api_name}/delete")
async def delete_api_key(api_name: str, request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_cookie(request, db)

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    db.delete(api_key)
    db.commit()

    return {"message": "API key deleted"}

@router.get("/list")
async def list_api_keys(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_from_cookie(request, db)
    
    api_keys = db.query(APIKey).filter_by(user_id=user.id).all()
    if not api_keys:
        raise HTTPException(status_code=404, detail="No API keys found for this user")

    return {"api_keys": [APIKeyOut.from_orm(k) for k in api_keys], "wallet_balance": user.wallet.balance}