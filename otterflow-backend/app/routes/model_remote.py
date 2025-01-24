from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from itsdangerous import URLSafeSerializer, BadSignature
from app.db.database import get_db
from app.db.models import User, ModelMetadata
import os

router = APIRouter(prefix="/models", tags=["Models"])

# Secret key for signing session tokens
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")
SESSION_COOKIE_NAME = "session_id"

@router.get("/get_models")
def get_models(
    request: Request,
    db: Session = Depends(get_db)
):
    # Inline user authentication
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session_data = serializer.loads(session_token)
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")

    user_id = session_data.get("user_id")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Fetch models from the database
    db_models = db.query(ModelMetadata).all()
    return {
        "models": [
            {
                "id": str(m.id),
                "name": m.model_name,
                "description": f"License: {getattr(m, 'license', 'N/A')}, Window: {getattr(m, 'window', 'N/A')}",
                "temperature": getattr(m, 'temperature', 0.5),
                "top_p": getattr(m, 'top_p', 1.0),
            }
            for m in db_models
        ]
    }

@router.get("/model_catalog")
def model_catalog(
    request: Request,
    db: Session = Depends(get_db)
):
    # Inline user authentication
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session_data = serializer.loads(session_token)
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")

    user_id = session_data.get("user_id")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Fetch models from the database
    db_models = db.query(ModelMetadata).all()
    return {
        "models": [
            {
                "id": str(m.id),
                "name": m.model_name,
                "cost": m.cost,
                "latency": m.latency,
                "performance" : m.performance
            }
            for m in db_models
        ]
    }

    

@router.post("/update-all")
def update_all_models(
    settings: dict,
    request: Request,
    db: Session = Depends(get_db)
):
    # Inline user authentication
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session_data = serializer.loads(session_token)
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")

    user_id = session_data.get("user_id")
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Update models in the database
    models_data = settings.get("models", [])
    for m_data in models_data:
        model_id = m_data.get("id")
        if not model_id:
            continue
        model = db.query(ModelMetadata).filter_by(id=model_id).first()
        if not model:
            continue

        model.temperature = m_data.get("temperature", model.temperature)
        model.top_p = m_data.get("top_p", model.top_p)
        # Update additional fields if needed

    db.commit()
    return {"message": "All model settings updated successfully"}
