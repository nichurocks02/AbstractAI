# app/routes/rl_metrics.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import UserBanditStats, User
from app.routes.auth import get_current_user

router = APIRouter(prefix="/rl-metrics", tags=["RL Metrics"])

@router.get("/logs", summary="Get Reinforcement Learning Metrics",include_in_schema=False)
def get_rl_metrics(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    stats = db.query(UserBanditStats).filter(UserBanditStats.user_id == user.id).all()
    rl_data = []
    for stat in stats:
        avg_reward = stat.cumulative_reward / stat.count if stat.count else 0
        rl_data.append({
            "model_name": stat.model_name,
            "domain_label": stat.domain_label,
            "cumulative_reward": stat.cumulative_reward,
            "count": stat.count,
            "average_reward": avg_reward,
            "updated_at": stat.updated_at.isoformat() if stat.updated_at else None
        })
    return {"rl_metrics": rl_data}
