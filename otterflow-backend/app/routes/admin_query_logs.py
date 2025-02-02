# app/routes/admin_query_logs.py

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from app.db.database import get_db
from app.db.models import QueryLog, User
from app.routes.admin_auth import get_current_admin
from fastapi.responses import JSONResponse

router = APIRouter(
    prefix="/admin/query-logs",
    tags=["AdminQueryLogs"]
)

def no_cache_response(content: dict, status_code: int = 200) -> JSONResponse:
    """
    Returns a JSONResponse with no-cache headers to prevent caching
    of admin data.
    """
    response = JSONResponse(content=content, status_code=status_code)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    return response

@router.get("/all-logs")
def get_query_logs(
    startDate: Optional[str] = Query(None, description="Start date in YYYY-MM-DD format"),
    endDate: Optional[str] = Query(None, description="End date in YYYY-MM-DD format"),
    userName: Optional[str] = Query(None, description="User name to filter"),
    model: Optional[str] = Query(None, description="Model name to filter"),
    db: Session = Depends(get_db),
    admin: bool = Depends(get_current_admin)  # admin-only dependency
):
    """
    Fetch query logs with optional filters:
      - startDate / endDate (YYYY-MM-DD). If omitted, fetch all time.
      - userName (User's name)
      - model (model name). If 'all' or omitted, fetch all models.
    """

    # Build base query
    q = db.query(QueryLog).join(User, QueryLog.user_id == User.id)

    # Filter by user name
    if userName:
        q = q.filter(User.name.ilike(f"%{userName}%"))  # Case-insensitive partial match

    # Filter by model name
    if model and model.lower() != "all":
        q = q.filter(QueryLog.model_name == model)

    # Filter by date range
    if startDate:
        try:
            start_dt = datetime.strptime(startDate, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            q = q.filter(QueryLog.timestamp >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid startDate format. Expected YYYY-MM-DD.")

    if endDate:
        try:
            # Interpret endDate as inclusive by setting time to end of day
            end_dt = datetime.strptime(endDate, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            end_dt_inclusive = end_dt.replace(hour=23, minute=59, second=59)
            q = q.filter(QueryLog.timestamp <= end_dt_inclusive)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid endDate format. Expected YYYY-MM-DD.")

    # Execute the query
    logs = q.order_by(QueryLog.timestamp.desc()).all()

    # Transform QueryLog objects into a list of dicts for the frontend DataTable
    data = []
    for log in logs:
        data.append({
            "timestamp": log.timestamp.isoformat(),            # e.g., "2023-06-01T10:00:00+00:00"
            "userName": log.user.name,                        # User's name
            "model": log.model_name,
            "query": log.query_input,
            "output": log.query_output,
            "tokens": log.total_tokens,
            "cost": f"${log.cost:.7f}"
        })

    # Return the data with no-cache headers
    return no_cache_response({"logs": data})

@router.get("/users/names", response_model=List[str])
def get_user_names(
    db: Session = Depends(get_db),
    admin: bool = Depends(get_current_admin)  # admin-only dependency
):
    """
    Fetch all unique user names for the dropdown filter.
    """
    user_names = db.query(User.name).distinct().all()
    # Extract names from tuples
    names = [name_tuple[0] for name_tuple in user_names]
    return names
