from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime
from typing import List

# Import your database session dependency and models
from app.db.database import get_db
from app.db.models import QueryLog, ModelMetadata, User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/metrics", tags=["Model Metrics"])

# -----------------------------------------------------------------------------
# Helper functions to compute metrics
# -----------------------------------------------------------------------------

def get_model_usage_distribution(db: Session, user_id: int) -> List[dict]:
    """
    Returns a list of dictionaries for each model with its name, percentage of total queries,
    and raw query count.
    """
    # Group QueryLogs for this user by model_name
    usage = (
        db.query(QueryLog.model_name, func.count(QueryLog.id).label("queries"))
          .filter(QueryLog.user_id == user_id)
          .group_by(QueryLog.model_name)
          .all()
    )
    total_queries = sum(item.queries for item in usage) or 1
    distribution = []
    for item in usage:
        percentage = (item.queries / total_queries) * 100
        distribution.append({
            "name": item.model_name,
            "value": round(percentage, 2),
            "queries": item.queries
        })
    return distribution


def get_daily_model_cost(db: Session, user_id: int) -> List[dict]:
    """
    Returns a list of daily total costs based on QueryLog records.
    """
    daily = (
        db.query(
            cast(QueryLog.timestamp, Date).label("date"),
            func.sum(QueryLog.cost).label("cost")
        )
        .filter(QueryLog.user_id == user_id)
        .group_by(cast(QueryLog.timestamp, Date))
        .order_by(cast(QueryLog.timestamp, Date))
        .all()
    )
    result = []
    for day in daily:
        result.append({
            "name": day.date.isoformat(),
            "cost": float(day.cost)
        })
    return result


def get_model_performance(db: Session, user_id: int) -> List[dict]:
    """
    Returns performance data for each model including:
      - average latency (from QueryLogs or fallback from ModelMetadata)
      - accuracy (using the ModelMetadata.performance field scaled as a percentage)
      - cost efficiency (normalized so that lower avg cost yields higher efficiency)
    """
    models = db.query(ModelMetadata).all()

    # Get maximum cost across all queries to serve as a baseline.
    max_cost = db.query(func.max(QueryLog.cost)).filter(QueryLog.user_id == user_id).scalar() or 1

    performance_data = []
    raw_efficiencies = []  # temporary storage for raw cost efficiency values
    for model in models:
        # Compute average latency for this model
        avg_latency = (
            db.query(func.avg(QueryLog.latency))
              .filter(QueryLog.user_id == user_id, QueryLog.model_name == model.model_name)
              .scalar()
        )
        avg_latency = float(avg_latency) if avg_latency is not None else (model.latency or 0)

        # Accuracy is taken from the stored performance (normalized [0,1]) scaled to percentage.
        accuracy = model.performance * 100 if model.performance is not None else 0

        # Compute average cost for this model from query logs (or fallback)
        avg_cost = (
            db.query(func.avg(QueryLog.cost))
              .filter(QueryLog.user_id == user_id, QueryLog.model_name == model.model_name)
              .scalar()
        )
        avg_cost = float(avg_cost) if avg_cost is not None else (model.cost or 0)

        # Compute a raw efficiency value: lower avg_cost gives a higher raw efficiency.
        # (If avg_cost is 0, we treat efficiency as high.)
        raw_efficiency = (max_cost / avg_cost) if avg_cost > 0 else 1
        raw_efficiencies.append(raw_efficiency)

        performance_data.append({
            "name": model.model_name,
            "latency": round(avg_latency, 2),
            "accuracy": round(accuracy, 2),
            "raw_efficiency": raw_efficiency,  # temporary field for normalization
        })

    # Normalize the raw efficiencies so that the maximum efficiency becomes 1.
    max_eff = max(raw_efficiencies) if raw_efficiencies else 1
    for entry in performance_data:
        entry["costEfficiency"] = round(entry["raw_efficiency"] / max_eff, 2)
        del entry["raw_efficiency"]

    return performance_data

def get_performance_scores(db: Session) -> List[dict]:
    """
    Returns performance scores (such as math, coding, and general knowledge) for each model.
    Assumes the scores are stored in ModelMetadata as normalized values in [0,1].
    """
    models = db.query(ModelMetadata).all()
    scores = []
    for model in models:
        scores.append({
            "name": model.model_name,
            "math": round(model.math_score * 100, 2) if model.math_score is not None else 0,
            "coding": round(model.coding_score * 100, 2) if model.coding_score is not None else 0,
            "generalKnowledge": round(model.gk_score * 100, 2) if model.gk_score is not None else 0,
        })
    return scores


def get_configuration_category(model: ModelMetadata) -> str:
    """
    Infers a configuration category based on model parameters.
    (For example, you might decide that a lower 'top_p' indicates high performance.)
    """
    if model.top_p < 0.8:
        return "High Performance"
    elif model.top_p > 0.95:
        return "Low Cost"
    else:
        return "Default"


def get_configuration_impact(db: Session, user_id: int) -> List[dict]:
    """
    Groups models by an inferred configuration setting and computes the average query cost and latency.
    """
    models = db.query(ModelMetadata).all()
    config_data = {}

    for model in models:
        category = get_configuration_category(model)
        # Get average cost and latency for queries for this model
        avg_cost = (
            db.query(func.avg(QueryLog.cost))
              .filter(QueryLog.user_id == user_id, QueryLog.model_name == model.model_name)
              .scalar()
        )
        avg_latency = (
            db.query(func.avg(QueryLog.latency))
              .filter(QueryLog.user_id == user_id, QueryLog.model_name == model.model_name)
              .scalar()
        )
        avg_cost = float(avg_cost) if avg_cost is not None else 0
        avg_latency = float(avg_latency) if avg_latency is not None else (model.latency or 0)

        if category not in config_data:
            config_data[category] = {"costs": [], "latencies": []}
        config_data[category]["costs"].append(avg_cost)
        config_data[category]["latencies"].append(avg_latency)

    impact = []
    for category, data in config_data.items():
        print(data)
        avg_cost = sum(data["costs"]) / len(data["costs"]) if data["costs"] else 0
        print(f"average costs : {avg_cost}")
        avg_latency = sum(data["latencies"]) / len(data["latencies"]) if data["latencies"] else 0
        impact.append({
            "setting": category,
            "avgCost": avg_cost,
            "avgLatency": round(avg_latency, 2)
        })

    return impact

# -----------------------------------------------------------------------------
# API endpoint to serve all model log metrics
# -----------------------------------------------------------------------------

@router.get("/model_logs", summary="Get model log metrics",include_in_schema=False)
def model_logs_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    user_id = user.id
    return {
        "model_usage_distribution": get_model_usage_distribution(db, user_id),
        "daily_model_cost": get_daily_model_cost(db, user_id),
        "model_performance": get_model_performance(db, user_id),
        "performance_scores": get_performance_scores(db),
        "configuration_impact": get_configuration_impact(db, user_id)
    }