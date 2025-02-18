# app/routes/model_remote.py

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
import os

from app.db.database import get_db
from app.db.models import User, ModelMetadata
from app.routes.auth import get_current_user, no_cache_response  # Import dependencies

router = APIRouter(prefix="/models", tags=["Models"])

@router.get("/get_models",include_in_schema=False)
def get_models(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # Use centralized dependency
):
    """
    Fetches all models from the database.
    """
    db_models = db.query(ModelMetadata).all()

    models = [
        {
            "id": str(m.id),
            "name": m.model_name,
            "description": f"License: {getattr(m, 'license', 'N/A')}, Window: {getattr(m, 'window', 'N/A')}",
            "temperature": getattr(m, 'temperature', 0.5),
            "top_p": getattr(m, 'top_p', 1.0),
            "licenseType": getattr(m, 'license', 'N/A')
        }
        for m in db_models
    ]

    return no_cache_response({"models": models})

@router.get("/model_catalog")
def model_catalog(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # Use centralized dependency
):
    """
    Fetches model catalog details from the database.
    """
    db_models = db.query(ModelMetadata).all()

    models = [
        {
            "id": str(m.id),
            "name": m.model_name,
            "cost": m.cost,
            "latency": m.latency,
            "performance": m.performance
        }
        for m in db_models
    ]

    return no_cache_response({"models": models})

@router.post("/update-all",include_in_schema=False)
def update_all_models(
    settings: dict,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)  # Use centralized dependency
):
    """
    Updates all model settings based on provided settings.
    """
    models_data = settings.get("models", [])
    for m_data in models_data:
        model_id = m_data.get("id")
        if not model_id:
            continue
        model = db.query(ModelMetadata).filter_by(id=model_id).first()
        if not model:
            continue

        # Update fields if provided
        if 'temperature' in m_data:
            model.temperature = m_data['temperature']
        if 'top_p' in m_data:
            model.top_p = m_data['top_p']
        # Add other fields as necessary

    db.commit()
    return no_cache_response({"message": "All model settings updated successfully."}, status_code=200)
