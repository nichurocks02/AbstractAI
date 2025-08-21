# app/routes/admin_models.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import ModelMetadata, QueryLog  # Adjust if usage stats come from QueryLog
from app.schemas.model_schemas import ModelCreate, ModelUpdate, ModelInDB
from app.routes.admin_auth import get_current_admin
from sqlalchemy import func
from fastapi.responses import JSONResponse

router = APIRouter(
    prefix="/admin/models",
    tags=["AdminModels"]
)

def no_cache_response(content: dict, status_code: int = 200) -> JSONResponse:
    """
    Returns a JSONResponse with no-cache headers.
    """
    response = JSONResponse(content=content, status_code=status_code)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    return response

@router.get("/list", response_model=List[ModelInDB],include_in_schema=False)
def get_all_models(db: Session = Depends(get_db), admin: bool = Depends(get_current_admin)):
    """
    Returns all models in the database.
    """
    models = db.query(ModelMetadata).all()
    return models

@router.post("/create", response_model=ModelInDB, status_code=status.HTTP_201_CREATED,include_in_schema=False)
def create_model(
    model_data: ModelCreate,
    db: Session = Depends(get_db),
    admin: bool = Depends(get_current_admin)
):
    """
    Create a new model with all required fields.
    """
    # Check if model_name already exists
    existing = db.query(ModelMetadata).filter(ModelMetadata.model_name == model_data.model_name).first()
    if existing:
        raise HTTPException(status_code=400, detail="A model with this name already exists.")

    new_model = ModelMetadata(
        model_name=model_data.model_name,
        license=model_data.license,
        window=model_data.window,
        cost=model_data.cost,
        latency=model_data.latency,
        performance=model_data.performance,
        math_score=model_data.math_score,
        coding_score=model_data.coding_score,
        gk_score=model_data.gk_score,
        input_cost_raw=model_data.input_cost_raw,
        output_cost_raw=model_data.output_cost_raw,
        top_p=model_data.top_p,
        temperature=model_data.temperature,
        io_ratio=model_data.io_ratio
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)
    return new_model

@router.put("/update/{model_id}", response_model=ModelInDB,include_in_schema=False)
def update_model(
    model_id: int,
    update_data: ModelUpdate,
    db: Session = Depends(get_db),
    admin: bool = Depends(get_current_admin)
):
    """
    Update an existing model. All fields are optional.
    """
    model = db.query(ModelMetadata).filter_by(id=model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")

    # Update only fields provided
    if update_data.model_name is not None:
        # Optional check if new name already exists (if desired)
        model.model_name = update_data.model_name
    if update_data.license is not None:
        model.license = update_data.license
    if update_data.window is not None:
        model.window = update_data.window

    if update_data.cost is not None:
        model.cost = update_data.cost
    if update_data.latency is not None:
        model.latency = update_data.latency
    if update_data.performance is not None:
        model.performance = update_data.performance

    if update_data.math_score is not None:
        model.math_score = update_data.math_score
    if update_data.coding_score is not None:
        model.coding_score = update_data.coding_score
    if update_data.gk_score is not None:
        model.gk_score = update_data.gk_score

    if update_data.input_cost_raw is not None:
        model.input_cost_raw = update_data.input_cost_raw
    if update_data.output_cost_raw is not None:
        model.output_cost_raw = update_data.output_cost_raw
    if update_data.top_p is not None:
        model.top_p = update_data.top_p
    if update_data.temperature is not None:
        model.temperature = update_data.temperature
    if update_data.io_ratio is not None:
        model.io_ratio = update_data.io_ratio

    db.commit()
    db.refresh(model)
    return model

@router.delete("/delete/{model_id}", status_code=status.HTTP_204_NO_CONTENT,include_in_schema=False)
def delete_model(model_id: int, db: Session = Depends(get_db), admin: bool = Depends(get_current_admin)):
    """
    Delete a model from the database.
    """
    model = db.query(ModelMetadata).filter_by(id=model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found.")
    db.delete(model)
    db.commit()
    return

@router.get("/usage-stats",include_in_schema=False)
def get_model_usage_stats(db: Session = Depends(get_db), admin: bool = Depends(get_current_admin)):
    """
    Return usage statistics for each model, such as total queries, total tokens, total cost, etc.
    You can retrieve these from QueryLog or a separate usage table.
    """
    # Example usage if you store queries in QueryLog with a "model_name" field:
    # If you have a separate "model_usage" table, adjust accordingly.

    # We'll do a simple aggregator from QueryLog:
    usage_data = (
        db.query(
            QueryLog.model_name.label("model"),
            func.count(QueryLog.id).label("totalQueries"),
            func.sum(QueryLog.total_tokens).label("totalTokens"),
            func.sum(QueryLog.cost).label("totalCost")
        )
        .group_by(QueryLog.model_name)
        .all()
    )

    # Transform into the structure needed for your table
    # e.g. { model: "GPT-3", totalQueries: 1000, totalTokens: 50000, totalCost: "$10.00" }
    results = []
    for row in usage_data:
        total_cost = row.totalCost if row.totalCost else 0.0
        results.append({
            "model": row.model,
            "totalQueries": row.totalQueries,
            "totalTokens": row.totalTokens if row.totalTokens else 0,
            "totalCost": f"${total_cost:.2f}",
        })

    return no_cache_response({"usage": results})
