# app/routes/admin_dashboard.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone, timedelta
from app.db.database import get_db
from app.db.models import User, QueryLog
from app.routes.admin_auth import get_current_admin  # The admin dependency
from fastapi.responses import JSONResponse

router = APIRouter(
    prefix="/admin/dashboard",
    tags=["AdminDashboard"]
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

@router.get("/metrics")
def get_admin_dashboard_metrics(
    db: Session = Depends(get_db), 
    admin: bool = Depends(get_current_admin)  # Ensure only admins can call this
):
    """
    Returns metrics for the Admin Dashboard:
    - Total Users
    - Total Queries
    - Total Cost
    - New Signups
    - Usage Over Time
    - Recent User Signups
    """

    # 1. Total Users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # 2. Total Queries
    total_queries = db.query(func.count(QueryLog.id)).scalar() or 0

    # 3. Total Cost
    total_cost = db.query(func.sum(QueryLog.cost)).scalar() or 0.0

    # 4. New Signups (last 7 days)
    one_week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    new_signups = db.query(func.count(User.id)).filter(User.created_at >= one_week_ago).scalar() or 0

    # 5. Usage Over Time (last 30 days)
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    usage_data = (
        db.query(
            func.date_trunc('day', QueryLog.timestamp).label('day'),
            func.count(QueryLog.id).label('queries_count')
        )
        .filter(QueryLog.timestamp >= thirty_days_ago)
        .group_by(func.date_trunc('day', QueryLog.timestamp))
        .order_by(func.date_trunc('day', QueryLog.timestamp))
        .all()
    )

    # Transform usage_data rows into a list of { date, queries }
    usage_over_time = [
        {
            "date": row.day.date().isoformat(),  # e.g., "2023-08-01"
            "queries": row.queries_count,
        }
        for row in usage_data
    ]

    # Optionally, fill in missing days with zero queries
    today = datetime.now(timezone.utc).date()
    start_date = today - timedelta(days=29)  # Last 30 days including today
    date_range = [start_date + timedelta(days=i) for i in range(30)]

    usage_over_time_dict = {item['date']: item['queries'] for item in usage_over_time}
    usage_over_time_complete = [
        {"date": single_date.isoformat(), "queries": usage_over_time_dict.get(single_date.isoformat(), 0)}
        for single_date in date_range
    ]

    # 6. Recent User Signups
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    recent_signups = [
        {
            "id": user.id,
            "email": user.email,
            "signupDate": user.created_at.date().isoformat()  # Assuming created_at is present
        }
        for user in recent_users
    ]

    data = {
        "total_users": total_users,
        "total_queries": total_queries,
        "total_cost": float(total_cost),
        "new_signups": new_signups,
        "usage_over_time": usage_over_time_complete,
        "recent_signups": recent_signups
    }

    return no_cache_response(content=data)
