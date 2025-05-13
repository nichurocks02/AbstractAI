from fastapi import APIRouter, HTTPException, Depends, Request
from itsdangerous import URLSafeSerializer, BadSignature
from sqlalchemy.orm import Session
import os

from app.db.models import User
from app.db.database import get_db
from app.db.models import User, Wallet, QueryLog # Make sure you have a ModelUsage table if you want usage logging

from app.db.database import SessionLocal 
from app.metrics.query_metrics import get_api_usage_over_time, get_average_latency, get_model_usage_distribution, get_notifications, get_recent_activity, get_total_api_calls, get_total_cost
from app.routes.auth import get_current_user, no_cache_response

router = APIRouter(prefix="/dashboard", tags=["Dashboard_Metrics"])

# Secret key for signing session tokens
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")

# Session cookie settings
SESSION_COOKIE_NAME = "session_id"


@router.get("/metrics", include_in_schema=False)
def dashboard_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user_id = user.id
    return {
        "total_api_calls": get_total_api_calls(db, user_id),
        "total_cost": get_total_cost(db, user_id),
        "average_latency": get_average_latency(db, user_id),
        "api_usage_over_time": get_api_usage_over_time(db, user_id),
        "model_usage_distribution": get_model_usage_distribution(db, user_id),
        "recent_activity": get_recent_activity(db, user_id),
        "notifications": get_notifications(db, user_id)
    }
