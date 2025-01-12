# app/routes/queries.py

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from transformers import GPT2Tokenizer
from itsdangerous import URLSafeSerializer
import os
from datetime import datetime

from app.db.database import get_db
from app.db.models import User, Wallet, ModelUsage  # Make sure you have a ModelUsage table if you want usage logging
from app.utility.utility import cost_per_query
# Import the DB-based pipeline
from app.machine_learning.pipeline import (
    predict_model_from_db,  # new DB-based function
    route_with_fallback,
    send_query_to_model
)

router = APIRouter(prefix="/query", tags=["Queries"])

# Session auth
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")
SESSION_COOKIE_NAME = "session_id"

@router.post("/")
async def handle_user_query(
    user_query: str, 
    user_input: dict, 
    request: Request, 
    db: Session = Depends(get_db)
):
    """
    1) Validate user session & wallet
    2) Query DB-based pipeline to get top models
    3) Possibly fallback
    4) Send query to chosen model, calculate tokens
    5) Deduct cost from wallet
    6) Return response
    """

    # 1) Validate user session
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = user.wallet
    if not wallet or wallet.balance <= 10:
        raise HTTPException(status_code=402, detail="Insufficient balance")

    # 2) DB-based pipeline 
    # user_input might be {"Cost":8, "Performance":9, "latency":2} => 0..10 scale
    # predict_model_from_db will do the weighting logic, returning top candidates
    top_candidates = predict_model_from_db(
        db=db, 
        user_input=user_input, 
        user_query=user_query, 
        alpha=0.5, 
        top_k=3
    )

    if not top_candidates:
        raise HTTPException(status_code=400, detail="No models found in database")

    # 3) Route with fallback 
    #    If you want a simpler approach, pick the first model from top_candidates
    fallback_result = route_with_fallback(user_query, top_candidates)
    chosen_model_name = fallback_result["model_name"]
    model_response = fallback_result["response"]

    # 4) Calculate tokens with GPT-2 tokenizer
    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    num_input_tokens = len(tokenizer.encode(user_query))
    num_output_tokens = len(tokenizer.encode(model_response))

    # Optional: Log usage in a ModelUsage table if you have it
    usage = ModelUsage(
        model_name=chosen_model_name,
        input_tokens=num_input_tokens,
        output_tokens=num_output_tokens,
        timestamp=datetime.utcnow()
    )
    db.add(usage)

    # 5) Deduct cost from wallet
    #    Find the chosen model's raw costs
    chosen_model = next(m for m in top_candidates if m["model_name"] == chosen_model_name)

    input_cost_per_million = chosen_model["input_cost_raw"]
    output_cost_per_million = chosen_model["output_cost_raw"]

    total_cost = cost_per_query(
        input_cost_per_million, 
        output_cost_per_million,
        num_input_tokens, 
        num_output_tokens
    )
    # If you want a 15% margin
    # total_cost *= 1.15

    if wallet.balance < total_cost:
        raise HTTPException(status_code=402, detail="Insufficient balance to process query")

    wallet.balance -= total_cost
    db.commit()

    # 6) Return response
    return {
        "response": model_response, 
        "wallet_balance": wallet.balance,
        "model_used": chosen_model_name
    }
