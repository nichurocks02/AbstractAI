# app/metrics/query_metrics.py

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import QueryLog, Wallet

def get_total_api_calls(db: Session, user_id: int) -> int:
    return db.query(QueryLog).filter(QueryLog.user_id == user_id).count()

def get_total_cost(db: Session, user_id: int) -> float:
    total_cost = db.query(func.sum(QueryLog.cost)).filter(QueryLog.user_id == user_id).scalar()
    return float(total_cost or 0)

def get_average_latency(db: Session, user_id: int) -> float:
    avg_latency = db.query(func.avg(QueryLog.latency)).filter(QueryLog.user_id == user_id).scalar()
    return float(avg_latency or 0)

def get_api_usage_over_time(db: Session, user_id: int) -> list:
    """
    Groups API calls by month and counts them.
    """
    results = (
        db.query(
            func.date_trunc('month', QueryLog.timestamp).label('month'),
            func.count(QueryLog.id).label('calls')
        )
        .filter(QueryLog.user_id == user_id)
        .group_by('month')
        .order_by('month')
        .all()
    )
    return [
        {
            "name": month.strftime("%b %Y"),  # e.g., "Jan 2025"
            "value": calls
        }
        for month, calls in results
    ]

def get_model_usage_distribution(db: Session, user_id: int) -> list:
    results = (
        db.query(
            QueryLog.model_name,  # Corrected attribute
            func.count(QueryLog.id).label('usage')
        )
        .filter(QueryLog.user_id == user_id)
        .group_by(QueryLog.model_name)
        .all()
    )
    return [{"name": model, "value": usage} for model, usage in results]

def get_recent_activity(db: Session, user_id: int) -> list:
    """
    Returns the last 5 log messages as activity descriptions.
    """
    logs = (
        db.query(QueryLog)
        .filter(QueryLog.user_id == user_id)
        .order_by(QueryLog.timestamp.desc())
        .limit(5)
        .all()
    )
    return [
        f"Processed prompt '{log.query_input[:30]}...' using {log.model_name}"
        for log in logs
    ]

def get_notifications(db: Session, user_id: int) -> list:
    """
    Generates notifications based on wallet balance and usage.
    """
    notifications = []

    # Fetch the user's wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()

    if not wallet:
        return notifications  # No wallet found, no notifications

    # Compute total usage cost
    total_usage_cost = get_total_cost(db, user_id)

    # Calculate usage percentage
    if wallet.balance > 0:
        usage_percent = (total_usage_cost / wallet.balance) * 100

        # Define thresholds
        thresholds = [20, 30, 50, 80, 90]

        for threshold in thresholds:
            if usage_percent >= threshold:
                notifications.append(
                    f"You have reached {threshold}% of your usage limit."
                )

    # Add other notifications as needed
    notifications.append("New model available: GPT-4-32k")

    return notifications
