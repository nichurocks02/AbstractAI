# app/routes/api_keys.py

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.models import User, APIKey
from app.db.database import get_db
from app.utility.utility import generate_unique_api_key, cost_per_query
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(
    prefix="/api-key",
    tags=["API Keys"]
)

# Pydantic model for APIKey output
class APIKeyOut(BaseModel):
    key: str
    api_name: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

@router.post("/")
async def generate_api_key(api_name: str, request: Request, db: Session = Depends(get_db)):
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = user.wallet
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")

    if wallet.balance < 100:  # $1.00 in cents
        raise HTTPException(status_code=400, detail="Insufficient balance in wallet")

    # Check if api_name is unique for this user
    existing_api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()
    if existing_api_key:
        raise HTTPException(status_code=400, detail="API name already exists for this user")

    # Generate API key and deduct from wallet
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
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Check if user has sufficient wallet balance if activating
    if is_active and user.wallet.balance < 0:
        raise HTTPException(status_code=402, detail="Insufficient wallet balance to activate the API key")

    api_key.is_active = is_active
    db.commit()

    return {"message": f"API key status updated to {'active' if is_active else 'inactive'}"}

@router.delete("/{api_name}")
async def revoke_api_key(api_name: str, request: Request, db: Session = Depends(get_db)):
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Revoke the API key by setting is_active to False
    api_key.is_active = False
    db.commit()

    return {"message": "API key revoked", "status": "inactive"}

@router.delete("/{api_name}/delete")
async def delete_api_key(api_name: str, request: Request, db: Session = Depends(get_db)):
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Delete the API key
    db.delete(api_key)
    db.commit()

    return {"message": "API key deleted"}

@router.get("/list")
async def list_api_keys(request: Request, db: Session = Depends(get_db)):
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    api_keys = db.query(APIKey).filter_by(user_id=user.id).all()

    if not api_keys:
        raise HTTPException(status_code=404, detail="No API keys found for this user")

    return {"api_keys": [APIKeyOut.from_orm(k) for k in api_keys], "wallet_balance": user.wallet.balance}
