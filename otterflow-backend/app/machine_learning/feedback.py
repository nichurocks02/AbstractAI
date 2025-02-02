# app/machine_learning/feedback.py

from sqlalchemy import func
from sklearn.preprocessing import MinMaxScaler
from app.db.models import ModelMetadata, QueryLog
from app.db.database import SessionLocal
from sqlalchemy.orm import Session

def recompute_model_io_ratio(db: Session):
    """
    Recompute and update normalized costs for each model based on historical query logs.
    Uses QueryLog to aggregate token usage, compute cost ratios, and update ModelMetadata.cost.
    """
    # 1. Aggregate token usage from QueryLog by model_name
    usage_data = db.query(
        QueryLog.model_name,
        func.sum(QueryLog.total_tokens - QueryLog.completion_tokens).label('total_in'),
        func.sum(QueryLog.completion_tokens).label('total_out')
    ).group_by(QueryLog.model_name).all()

    # 2. Compute output/input ratio for each model
    ratios = {}
    for record in usage_data:
        total_in = record.total_in or 0
        total_out = record.total_out or 0
        ratio = total_out / float(total_in) if total_in != 0 else 3.0
        ratios[record.model_name] = ratio

    # Update each model's io_ratio in ModelMetadata
    all_models = db.query(ModelMetadata).all()
    for model in all_models:
        # Use computed ratio or default to 1.0 if no data
        model.io_ratio = ratios.get(model.model_name, 3.0)
    db.commit()