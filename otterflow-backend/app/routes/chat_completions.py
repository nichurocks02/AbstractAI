from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Literal
import time
import json
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.db.database import get_db, SessionLocal
from app.db.models import User, QueryLog, APIKey, ModelMetadata
from app.machine_learning.pipeline import (
    detect_domain_via_openai,
    predict_model_from_db,
    bandit_manager,
    route_with_fallback,
    send_query_to_model,
    are_queries_similar
)
from app.utility.utility import cost_per_query
from transformers import GPT2Tokenizer

router = APIRouter(prefix="/chat", tags=["ChatCompletion"])

class ChatCompletionRequest(BaseModel):
    api_key: str
    user_query: str
    mode: Literal["manual", "auto"]
    # For manual mode:
    chosen_model: Optional[str] = None
    # For auto mode, preferences (defaults to 5 if not provided)
    cost_priority: Optional[float] = 5.0
    accuracy_priority: Optional[float] = 5.0
    latency_priority: Optional[float] = 5.0
    # Also include constraints for filtering (optional)
    cost_max: Optional[float] = None
    perf_min: Optional[float] = None
    lat_max: Optional[float] = None

@router.post("/completion", summary="Chat Completion (OpenAI-compatible)")
async def chat_completion(
    payload: ChatCompletionRequest,
    db: Session = Depends(get_db)
):
    """
    This endpoint accepts a JSON payload and returns an OpenAI-like
    chat completion. It supports both manual and auto modes.

    - For manual mode, the payload must include "chosen_model".
    - For auto mode, it accepts cost/accuracy/latency priorities along with
      optional constraints: cost_max, perf_min, and lat_max.
    - The API key is used to authenticate and identify the user.
    - The endpoint performs domain detection via OpenAI and uses the detected
      domain in reward updates.
    """
    # 1. Validate API key and get user
    api_key_value = payload.api_key
    api_key_record = db.query(APIKey).filter_by(key=api_key_value, is_active=True).first()
    if not api_key_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")
    user = api_key_record.user
    wallet = user.wallet
    if not wallet or wallet.balance < 5:
        raise HTTPException(status_code=402, detail="Insufficient balance")
    
    user_query = payload.user_query.strip()
    if not user_query:
        raise HTTPException(status_code=400, detail="Empty user_query")
    
    # 2. Call domain detection at the beginning
    current_domain = await detect_domain_via_openai(user_query, wallet, db)
    
    # 3. Re-query/override detection using current_domain
    last_log = (
        db.query(QueryLog)
        .filter(QueryLog.user_id == user.id)
        .order_by(QueryLog.timestamp.desc())
        .first()
    )
    if last_log and are_queries_similar(last_log.query_input, user_query):
        bandit_manager.update_reward(
            db=db,
            user_id=user.id,
            model_name=last_log.model_name,
            domain_label=current_domain,
            reward=-1.0
        )
    chosen_model_name = payload.dict().get("chosen_model")
    if chosen_model_name and last_log and chosen_model_name != last_log.model_name:
        bandit_manager.update_reward(
            db=db,
            user_id=user.id,
            model_name=last_log.model_name,
            domain_label=current_domain,
            reward=-0.5
        )
    
    start_time = time.perf_counter()
    query_output = ""
    final_model_name = "unknown"
    license_type = "unknown"
    completion_tokens = 0
    total_tokens = 0
    total_cost = 0

    if payload.mode == "manual":
        # Manual mode requires chosen_model.
        if not payload.chosen_model:
            raise HTTPException(status_code=400, detail="chosen_model required in manual mode")
        chosen_model_name = payload.chosen_model
        chosen_model = db.query(ModelMetadata).filter_by(model_name=chosen_model_name).first()
        if not chosen_model:
            raise HTTPException(status_code=404, detail=f"Model '{chosen_model_name}' not found")
        try:
            fallback_result = await send_query_to_model(
                user_query,
                {
                    "model_name": chosen_model.model_name,
                    "license": chosen_model.license,
                    "input_cost_raw": chosen_model.input_cost_raw,
                    "output_cost_raw": chosen_model.output_cost_raw
                }
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Manual model error: {str(e)}")
        query_output = fallback_result.get("query_output", "")
        final_model_name = fallback_result.get("model_name", "unknown")
        license_type = fallback_result.get("license_type", "unknown")
        completion_tokens = fallback_result.get("completion_tokens", 0)
        total_tokens = fallback_result.get("total_tokens", 0)
        if not query_output:
            raise HTTPException(status_code=500, detail="Empty response from manual model")
        tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        num_input_tokens = len(tokenizer.encode(user_query))
        num_output_tokens = len(tokenizer.encode(query_output))
        base_cost = cost_per_query(
            chosen_model.input_cost_raw,
            chosen_model.output_cost_raw,
            num_input_tokens,
            num_output_tokens
        )
        total_cost = base_cost * 1.15
        if wallet.balance < total_cost:
            raise HTTPException(status_code=402, detail="Insufficient wallet balance for final cost")
        wallet.balance -= total_cost
        db.commit()
    else:
        # Auto mode:
        cost_priority = float(payload.cost_priority or 5)
        accuracy_priority = float(payload.accuracy_priority or 5)
        latency_priority = float(payload.latency_priority or 5)
        total_priority = cost_priority + accuracy_priority + latency_priority or 1.0
        alpha = cost_priority / total_priority
        beta = accuracy_priority / total_priority
        gamma = latency_priority / total_priority
        # Pass entire payload dict so that predict_model_from_db picks up constraints
        top_candidates = predict_model_from_db(db, payload.dict(), user_query, alpha, beta, gamma, top_k=3)
        if not top_candidates:
            raise HTTPException(status_code=404, detail="No models found in auto mode")
        chosen_candidate = bandit_manager.epsilon_greedy_selection(
            db=db,
            user_id=user.id,
            candidates=top_candidates,
            domain_label=current_domain,
            epsilon=0.1
        )
        fallback_candidates = [chosen_candidate] + [
            c for c in top_candidates if c["model_name"] != chosen_candidate["model_name"]
        ]
        try:
            fallback_result = await route_with_fallback(user_query, fallback_candidates)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Fallback error: {str(e)}")
        query_output = fallback_result.get("query_output", "")
        final_model_name = fallback_result.get("model_name", "unknown")
        license_type = fallback_result.get("license_type", "unknown")
        completion_tokens = fallback_result.get("completion_tokens", 0)
        total_tokens = fallback_result.get("total_tokens", 0)
        if not query_output:
            raise HTTPException(status_code=500, detail="Empty LLM response")
        tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
        num_input_tokens = len(tokenizer.encode(user_query))
        num_output_tokens = len(tokenizer.encode(query_output))
        chosen_model_data = next((m for m in top_candidates if m["model_name"] == final_model_name), None)
        if not chosen_model_data:
            raise HTTPException(status_code=500, detail="Chosen model data not found in top candidates")
        base_cost = cost_per_query(
            chosen_model_data["input_cost_raw"],
            chosen_model_data["output_cost_raw"],
            num_input_tokens,
            num_output_tokens
        )
        total_cost = base_cost * 1.15
        if wallet.balance < total_cost:
            raise HTTPException(status_code=402, detail="Insufficient balance")
        wallet.balance -= total_cost
        db.commit()
        std_err = bandit_manager.get_standard_error(db, user.id, chosen_candidate["model_name"], current_domain)
        if final_model_name == chosen_candidate["model_name"]:
            bandit_manager.update_reward(db, user.id, final_model_name, current_domain, +0.5)
        else:
            bandit_manager.update_reward(db, user.id, chosen_candidate["model_name"], current_domain, -0.5)
    
    latency_measured = time.perf_counter() - start_time

    # Log the query
    _db_sess = SessionLocal()
    try:
        log_entry = QueryLog(
            user_id=user.id,
            chat_topic="default",
            query_input=user_query,
            query_output=query_output,
            model_name=final_model_name,
            provider_name=license_type,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency=latency_measured,
            cost=total_cost,
            cost_preference=int(payload.cost_priority or 5),
            latency_preference=int(payload.latency_priority or 5),
            performance_preference=int(payload.accuracy_priority or 5),
            timestamp=datetime.now(timezone.utc)
        )
        _db_sess.add(log_entry)
        _db_sess.commit()
    except Exception as e:
        _db_sess.rollback()
    finally:
        _db_sess.close()

    created_time = int(time.time())
    return {
        "id": f"chatcmpl-{created_time}",
        "object": "chat.completion",
        "created": created_time,
        "model": final_model_name,
        "usage": {
            "prompt_tokens": num_input_tokens,
            "completion_tokens": num_output_tokens,
            "total_tokens": num_input_tokens + num_output_tokens,
        },
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": query_output
                },
                "finish_reason": "stop"
            }
        ]
    }



# ----------------------------------------------------------------------
# Model Catalog Endpoint, Accepting API Key in JSON Body
# ----------------------------------------------------------------------
class ModelCatalogRequest(BaseModel):
    api_key: str

@router.post("/model_catalog", summary="Model Catalog via POST")
def model_catalog(
    payload: ModelCatalogRequest,
    db: Session = Depends(get_db)
):
    """
    Fetches model catalog details from the database,
    accepting the API key in the request body.
    """
    # Validate the API key from the request body
    api_key_value = payload.api_key
    api_key_record = db.query(APIKey).filter_by(key=api_key_value, is_active=True).first()
    if not api_key_record:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    # We have a valid user if we want to check wallet or other conditions
    user = api_key_record.user

    # Query all models
    db_models = db.query(ModelMetadata).all()
    models = [
        {
            "id": str(m.id),
            "name": m.model_name,
            "cost": m.cost,
            "latency": m.latency,
            "performance": m.performance
        }
        for m in db_models
    ]

    return JSONResponse({"models": models})