from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from itsdangerous import URLSafeSerializer, BadSignature
from sqlalchemy.orm import Session
import os
import math

from transformers import GPT2Tokenizer
from app.db.models import User
from app.db.database import get_db
from app.db.models import User, Wallet, QueryLog # Make sure you have a ModelUsage table if you want usage logging
from app.utility.utility import cost_per_query
from app.machine_learning.pipeline import predict_model_from_db, route_with_fallback
from app.db.database import SessionLocal 
import json
import time

router = APIRouter(prefix="/query", tags=["Queries"])


# Secret key for signing session tokens
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")

# Session cookie settings
SESSION_COOKIE_NAME = "session_id"

def get_current_user_from_cookie(request: Request, db: Session):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session_data = serializer.loads(session_token)
        user_id = session_data.get("user_id")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@router.post("/handle_user_query")
async def handle_user_query(
    user_query: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Parse JSON body to extract user_input
    try:
        data = await request.json()
    except Exception as e:
        print(f"JSON parsing error: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")
        
    user_input = data.get("user_input")
    if not user_input:
        raise HTTPException(status_code=400, detail="Missing 'user_input' in request body.")

    # Validate user session and wallet synchronously
    try:
        user = get_current_user_from_cookie(request, db)
    except Exception as e:
        print(f"User authentication failed: {e}")
        raise

    wallet = user.wallet
    if not wallet or wallet.balance <= 10:
        raise HTTPException(status_code=402, detail="Insufficient balance")

    # Calculate weights based on user preferences
    try:
        cost_priority = float(user_input.get("cost_priority", 1))
        accuracy_priority = float(user_input.get("accuracy_priority", 1))
        latency_priority = float(user_input.get("latency_priority", 1))
    except (ValueError, TypeError) as e:
        print(f"Preference parsing error: {e}")
        raise HTTPException(status_code=400, detail="Invalid preference values.")

    total_priority = cost_priority + accuracy_priority + latency_priority or 1.0
    alpha = cost_priority / total_priority
    beta = accuracy_priority / total_priority
    gamma = latency_priority / total_priority

    # Query DB-based pipeline to get top candidate models
    top_candidates = predict_model_from_db(
        db=db,
        user_input=user_input,
        user_query=user_query,
        alpha=alpha,
        beta=beta,
        gamma=gamma,
        top_k=3
    )
    if not top_candidates:
        raise HTTPException(status_code=400, detail="No models found in database")

    # Route with fallback and measure latency
    start_time = time.perf_counter()
    try:
        fallback_result = await route_with_fallback(
            user_query=user_query,
            candidates=top_candidates
        )
    except Exception as e:
        print(f"Fallback routing failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to obtain model response")

    latency_measured = time.perf_counter() - start_time

    # Validate fallback result
    if not fallback_result:
        raise HTTPException(status_code=500, detail="Model routing failed to return a result")

    # Extract information from fallback_result
    model_name = fallback_result.get("model_name")
    license_type = fallback_result.get("license_type")
    query_output = fallback_result.get("query_output")
    completion_tokens = fallback_result.get("completion_tokens", 0)
    total_tokens = fallback_result.get("total_tokens", 0)
    raw_response = fallback_result.get("raw_response", {})

    # Check if query_output is empty and raise an exception if so
    if not query_output:
        raise HTTPException(status_code=500, detail="Received empty response from model.")

    # Retrieve chosen model details from top_candidates
    chosen_model = next((m for m in top_candidates if m["model_name"] == model_name), None)
    if not chosen_model:
        raise HTTPException(status_code=500, detail="Chosen model data not found.")

    input_cost_raw = chosen_model.get("input_cost_raw", 0.0)
    output_cost_raw = chosen_model.get("output_cost_raw", 0.0)

    # Cost Calculation using GPT2 tokenizer
    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
    num_input_tokens = len(tokenizer.encode(user_query))
    num_output_tokens = len(tokenizer.encode(query_output))

    base_cost = cost_per_query(input_cost_raw, output_cost_raw, num_input_tokens, num_output_tokens)
    total_cost = base_cost * 1.15  # Add 15% margin

    if wallet.balance < total_cost:
        raise HTTPException(status_code=402, detail="Insufficient balance to process query")

    # Deduct cost synchronously
    wallet.balance = wallet.balance - total_cost
    db.add(wallet)             # Explicitly add/update wallet in session
    db.commit()
    db.refresh(wallet)         # Refresh to get updated state
    print(f"Balance after deduction: {wallet.balance}")
    print("Attempting synchronous logging...")
    try:
        # Directly call log_query instead of scheduling a background task
        def log_query():
            background_db = SessionLocal()
            print("Started New Session for synchronous logging")
            try:
                log_entry = QueryLog(
                    user_id=user.id,
                    chat_topic="default",
                    query_input=user_query,
                    query_output=query_output,
                    model_name=model_name,
                    provider_name=license_type,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    latency=latency_measured,
                    cost=total_cost,
                    cost_preference=int(cost_priority),
                    latency_preference=int(latency_priority),
                    performance_preference=int(accuracy_priority)
                )
                background_db.add(log_entry)
                background_db.commit()
                background_db.refresh(log_entry)
                print(f"Logged query synchronously for user {user.id}, model {model_name}")
            except Exception as e:
                print(f"Logging failed synchronously: {e}")
                background_db.rollback()
            finally:
                background_db.close()

        log_query()
    except Exception as e:
        print(f"Synchronous logging encountered an exception: {e}")

    return {
        "response": query_output,
        "model_used": model_name,
        "provider": license_type,
        "cost": total_cost,
        "latency": latency_measured
    }



@router.get("/get_ranges")
async def get_ranges(db: Session = Depends(get_db)):
    """
    Provide the dynamic range for cost, performance, and latency.
    These can be used in the UI to set slider min/max.
    """
    from app.db.models import ModelMetadata

    # Query min/max
    cost_min_record = db.query(ModelMetadata).order_by(ModelMetadata.cost.asc()).first()
    cost_max_record = db.query(ModelMetadata).order_by(ModelMetadata.cost.desc()).first()
    cost_min = cost_min_record.cost if cost_min_record else 0.0
    cost_max = cost_max_record.cost if cost_max_record else 100.0

    perf_min_record = db.query(ModelMetadata).order_by(ModelMetadata.performance.asc()).first()
    perf_max_record = db.query(ModelMetadata).order_by(ModelMetadata.performance.desc()).first()
    perf_min = perf_min_record.performance if perf_min_record else 0.0
    perf_max = perf_max_record.performance if perf_max_record else 100.0

    lat_min_record = db.query(ModelMetadata).order_by(ModelMetadata.latency.asc()).first()
    lat_max_record = db.query(ModelMetadata).order_by(ModelMetadata.latency.desc()).first()
    lat_min = lat_min_record.latency if lat_min_record else 0.0
    lat_max = lat_max_record.latency if lat_max_record else 30

     # Round values for user-friendly boundaries
    # For minimums, use floor; for maximums, use ceil.
    cost_min = math.floor( cost_min)
    cost_max = math.ceil( cost_max)
    performance_min = math.floor( perf_min)
    performance_max = math.ceil( perf_max)
    latency_min = math.floor( lat_min)
    latency_max = math.ceil( lat_max)

    print(cost_min,cost_max,lat_min,lat_max,perf_min,perf_max)
    return {
        "cost_min": cost_min,
        "cost_max": cost_max,
        "performance_min": performance_min,
        "performance_max": performance_max,
        "latency_min": latency_min,
        "latency_max": latency_max,
    }
