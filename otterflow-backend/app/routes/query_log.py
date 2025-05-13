# app/routes/query_logs.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from datetime import datetime
from typing import Optional

from app.db.database import get_db
from app.db.models import QueryLog, User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/query_log", tags=["Query Logs"])

@router.get("/logs", summary="Get query logs and aggregated data", include_in_schema=False)
def get_query_logs(
    start_date: Optional[str] = Query(None, description="Filter logs from this date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="Filter logs until this date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Parse the start_date and end_date (if provided)
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD.")
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD.")

    # --- Detailed Logs ---
    # Query the logs for the current user and apply date filters if provided.
    logs_query = db.query(QueryLog).filter(QueryLog.user_id == user.id)
    if start_dt:
        logs_query = logs_query.filter(QueryLog.timestamp >= start_dt)
    if end_dt:
        logs_query = logs_query.filter(QueryLog.timestamp <= end_dt)
    logs = logs_query.order_by(QueryLog.timestamp.desc()).all()

    # Build the logs list (note: we use `query_input` for the query text)
    logs_data = []
    for log in logs:
        logs_data.append({
            "id": log.id,
            "timestamp": log.timestamp.isoformat(),
            "user": log.user.email if log.user else "Unknown",
            "query": log.query_input,
            "llm_response": log.query_output,
            "model": log.model_name,
            "tokens": log.total_tokens,
            "cost": log.cost,
        })

    # --- Daily Query Data ---
    # Aggregate logs by date (using the timestamp field) and count the number of queries.
    daily_query_q = db.query(
        cast(QueryLog.timestamp, Date).label("date"),
        func.count(QueryLog.id).label("queries")
    ).filter(QueryLog.user_id == user.id)
    if start_dt:
        daily_query_q = daily_query_q.filter(QueryLog.timestamp >= start_dt)
    if end_dt:
        daily_query_q = daily_query_q.filter(QueryLog.timestamp <= end_dt)
    daily_query_q = daily_query_q.group_by(cast(QueryLog.timestamp, Date)).order_by(cast(QueryLog.timestamp, Date))
    daily_query_data = []
    for row in daily_query_q.all():
        daily_query_data.append({
            "name": row.date.strftime("%b %d"),  # e.g. "Jun 01"
            "queries": row.queries
        })

    # --- Model Usage Data ---
    # Group the logs by model and count them.
    model_usage_q = db.query(
        QueryLog.model_name.label("name"),
        func.count(QueryLog.id).label("value")
    ).filter(QueryLog.user_id == user.id)
    if start_dt:
        model_usage_q = model_usage_q.filter(QueryLog.timestamp >= start_dt)
    if end_dt:
        model_usage_q = model_usage_q.filter(QueryLog.timestamp <= end_dt)
    model_usage_q = model_usage_q.group_by(QueryLog.model_name)
    model_usage_data = []
    for row in model_usage_q.all():
        model_usage_data.append({
            "name": row.name,
            "value": row.value
        })

    return {
        "logs": logs_data,
        "daily_query_data": daily_query_data,
        "model_usage_data": model_usage_data
    }
