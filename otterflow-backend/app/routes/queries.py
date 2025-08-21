# file: queries.py

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
import asyncio
import time
import logging
import json

from sqlalchemy.orm import Session, joinedload

from transformers import GPT2Tokenizer

from app.db.database import get_db, SessionLocal
from app.db.models import User, Wallet, QueryLog
from app.utility.utility import cost_per_query
from app.machine_learning.pipeline import (
    predict_model_from_db,
    route_with_fallback,
    send_query_to_model,
    bandit_manager,
    detect_domain_via_openai,  # [CHANGED] Using new domain detection
    are_queries_similar
)
from itsdangerous import URLSafeSerializer, BadSignature
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/query", tags=["Queries"], include_in_schema=False)
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "your-secret-key")
SESSION_COOKIE_NAME = "session_id"
serializer = URLSafeSerializer(SESSION_SECRET_KEY, salt="session")


def get_current_user_from_cookie(request: Request, db: Session):
    session_token = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        session_data = serializer.loads(session_token)
        user_id = session_data.get("user_id")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Invalid session")
    # Eager load the wallet relationship
    user = db.query(User).options(joinedload(User.wallet)).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def _sse_event(data: dict) -> str:
    json_data = json.dumps(data)
    return f"data: {json_data}\n\n"


def _sync_log_query(
    user_id: int,
    user_query: str,
    query_output: str,
    model_name: str,
    license_type: str,
    completion_tokens: int,
    total_tokens: int,
    latency: float,
    cost: float,
    db: Session,
    manual: bool = False,
    cost_priority: float = 0,
    latency_priority: float = 0,
    accuracy_priority: float = 0
):
    try:
        from datetime import datetime, timezone
        log_entry = QueryLog(
            user_id=user_id,
            chat_topic="default",
            query_input=user_query,
            query_output=query_output,
            model_name=model_name,
            provider_name=license_type,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
            latency=latency,
            cost=cost,
            cost_preference=int(cost_priority),
            latency_preference=int(latency_priority),
            performance_preference=int(accuracy_priority),
            timestamp=datetime.now(timezone.utc)
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        logger.info(f"[{'MANUAL' if manual else 'AUTO'}] Logged query for user={user_id}, model={model_name}")
    except Exception as e:
        logger.error(f"Logging error: {e}")
        db.rollback()
    finally:
        db.close()


@router.get("/handle_user_query_stream", include_in_schema=False)
async def handle_user_query_stream(request: Request, db: Session = Depends(get_db)):
    user_query = request.query_params.get("user_query", None)
    if not user_query:
        raise HTTPException(status_code=400, detail="Missing user_query")

    user_input_str = request.query_params.get("user_input", None)
    if not user_input_str:
        raise HTTPException(status_code=400, detail="Missing user_input")

    try:
        user_input = json.loads(user_input_str)
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Auth & wallet check
    user = get_current_user_from_cookie(request, db)
    wallet = user.wallet
    if not wallet or wallet.balance <= 5:
        async def error_stream():
            yield _sse_event({"error": "Insufficient balance. Please top up."})
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    current_domain = await detect_domain_via_openai(user_query, wallet, db)

    # Retrieve last query to detect override or re-query
    last_log = (
        db.query(QueryLog)
        .filter(QueryLog.user_id == user.id)
        .order_by(QueryLog.timestamp.desc())
        .first()
    )

    async def event_stream():
        try:
            # Re-query and override detection using similarity
            if last_log:
                if are_queries_similar(last_log.query_input, user_query):
                    bandit_manager.update_reward(
                        db=db,
                        user_id=user.id,
                        model_name=last_log.model_name,
                        domain_label=current_domain,  # generic fallback label
                        reward=-1.0
                    )
                    logger.info(f"User {user.id} re-queried => negative reward for model {last_log.model_name}")
                chosen_model_name = user_input.get("chosen_model")
                if chosen_model_name and chosen_model_name != last_log.model_name:
                    bandit_manager.update_reward(
                        db=db,
                        user_id=user.id,
                        model_name=last_log.model_name,
                        domain_label=current_domain,
                        reward=-0.5
                    )
                    logger.info(f"User {user.id} override from model {last_log.model_name} to {chosen_model_name}")

            # Branch: Manual Mode vs. Auto Mode
            if "chosen_model" in user_input:
                # --- Manual Mode ---
                yield _sse_event({"step": "Manual Selection", "model_chosen": user_input["chosen_model"]})
                from app.db.models import ModelMetadata
                chosen_model = db.query(ModelMetadata).filter_by(model_name=user_input["chosen_model"]).first()
                if not chosen_model:
                    yield _sse_event({"error": f"Model '{user_input['chosen_model']}' not found"})
                    return
                yield _sse_event({
                    "step": "Fetching model details",
                    "license": chosen_model.license,
                    "cost": chosen_model.cost,
                    "latency": chosen_model.latency
                })
                await asyncio.sleep(0.1)
                start_time = time.perf_counter()
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
                    yield _sse_event({"error": f"Failed manual model: {str(e)}"})
                    return
                latency = time.perf_counter() - start_time
                query_output = fallback_result.get("query_output", "")
                model_name = fallback_result.get("model_name", "unknown")
                license_type = fallback_result.get("license_type", "unknown")
                completion_tokens = fallback_result.get("completion_tokens", 0)
                total_tokens = fallback_result.get("total_tokens", 0)
                if not query_output:
                    yield _sse_event({"error": "Empty response from manual model"})
                    return
                from transformers import GPT2Tokenizer
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
                    yield _sse_event({"error": "Insufficient balance"})
                    return
                wallet.balance -= total_cost
                db.commit()
                yield _sse_event({
                    "step": "Cost & Latency",
                    "metrics": {
                        "latency": latency,
                        "cost": total_cost,
                        "model_name": model_name
                    }
                })
                # LOG the successful usage to bandit stats:
                bandit_manager.update_reward(
                    db=db,
                    user_id=user.id,
                    model_name=const_model_name,
                    domain_label=current_domain,
                    reward=1.0
                )
                logger.info(f"User {user.id} used model {const_model_name} successfully => +1.0 reward")

                _sync_log_query(
                    user_id=user.id,
                    user_query=user_query,
                    query_output=query_output,
                    model_name=model_name,
                    license_type=license_type,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    latency=latency,
                    cost=total_cost,
                    db=SessionLocal(),
                    manual=True,
                    cost_priority=user_input.get("cost_priority", 1),
                    latency_priority=user_input.get("latency_priority", 1),
                    accuracy_priority=user_input.get("accuracy_priority", 1)
                )
                # For manual mode, set domain to "manual"
                yield _sse_event({"final_response": query_output, "model_used": model_name, "domain": "manual"})
                yield _sse_event({"step": "end", "message": "end-of-stream"})
                return
            else:
                # --- Auto Mode ---
                cost_priority = float(user_input.get("cost_priority", 1))
                accuracy_priority = float(user_input.get("accuracy_priority", 1))
                latency_priority = float(user_input.get("latency_priority", 1))
                total_priority = cost_priority + accuracy_priority + latency_priority or 1.0
                alpha = cost_priority / total_priority
                beta = accuracy_priority / total_priority
                gamma = latency_priority / total_priority
                yield _sse_event({
                    "step": "User Preferences",
                    "metrics": {
                        "cost_priority": cost_priority,
                        "accuracy_priority": accuracy_priority,
                        "latency_priority": latency_priority
                    }
                })
                top_candidates = predict_model_from_db(db, user_input, user_query, alpha, beta, gamma, top_k=3)
                if not top_candidates:
                    yield _sse_event({"error": "No models found"})
                    return
                yield _sse_event({
                    "step": "Top Candidates",
                    "models": [
                        {
                            "model_name": c["model_name"],
                            "score": round(c["final_score"], 3),
                            "cost": c["cost"],
                            "latency": c["latency"],
                            "performance": c["performance"]
                        }
                        for c in top_candidates
                    ]
                })
                # Use domain detection via OpenAI
                #current_domain = await detect_domain_via_openai(user_query, wallet, db)
                logger.info(f"Detected domain: {current_domain}")
                const_start_time = time.perf_counter()  # using a temporary variable name
                chosen_candidate = bandit_manager.epsilon_greedy_selection(
                    db=db,
                    user_id=user.id,
                    candidates=top_candidates,
                    domain_label=current_domain,
                    epsilon=0.1
                )
                ordered_candidates = [chosen_candidate] + [
                    c for c in top_candidates if c["model_name"] != chosen_candidate["model_name"]
                ]
                try:
                    fallback_result = await route_with_fallback(user_query, ordered_candidates)
                except Exception as e:
                    yield _sse_event({ "error": f"Failed fallback: {str(e)}" })
                    return
                const_latency_measured = time.perf_counter() - const_start_time
                if not fallback_result.get("query_output"):
                    yield _sse_event({ "error": "Empty LLM response" })
                    return
                const_query_output = fallback_result.get("query_output")
                const_model_name = fallback_result.get("model_name")
                const_license_type = fallback_result.get("license_type")
                const_completion_tokens = fallback_result.get("completion_tokens", 0)
                const_total_tokens = fallback_result.get("total_tokens", 0)
                yield _sse_event({
                    "step": "Chosen Model",
                    "model_name": const_model_name,
                    "license_type": const_license_type
                })
                from transformers import GPT2Tokenizer
                const_tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
                const_num_input_tokens = len(const_tokenizer.encode(user_query))
                const_num_output_tokens = len(const_tokenizer.encode(const_query_output))
                const_chosen_model_data = next((x for x in top_candidates if x["model_name"] == const_model_name), None)
                const_base_cost = cost_per_query(
                    const_chosen_model_data["input_cost_raw"],
                    const_chosen_model_data["output_cost_raw"],
                    const_num_input_tokens,
                    const_num_output_tokens
                )
                const_total_cost = const_base_cost * 1.15
                if (wallet.balance < const_total_cost):
                    yield _sse_event({ "error": "Insufficient balance" })
                    return
                wallet.balance -= const_total_cost
                db.commit()
                yield _sse_event({
                    "step": "Cost & Latency",
                    "metrics": {
                        "latency": const_latency_measured,
                        "cost": const_total_cost,
                        "model_name": const_model_name
                    }
                })

                # LOG the successful usage to bandit stats:
                bandit_manager.update_reward(
                    db=db,
                    user_id=user.id,
                    model_name=const_model_name,
                    domain_label=current_domain,
                    reward=1.0
                )
                logger.info(f"User {user.id} used model {const_model_name} successfully => +1.0 reward")

                _sync_log_query(
                    user_id=user.id,
                    user_query=user_query,
                    query_output=const_query_output,
                    model_name=const_model_name,
                    license_type=const_license_type,
                    completion_tokens=const_completion_tokens,
                    total_tokens=const_total_tokens,
                    latency=const_latency_measured,
                    cost=const_total_cost,
                    db=SessionLocal(),
                    manual=False,
                    cost_priority=cost_priority,
                    latency_priority=latency_priority,
                    accuracy_priority=accuracy_priority
                )
                const_std_err = bandit_manager.get_standard_error(db, user.id, chosen_candidate["model_name"], current_domain)
                const_rl_status = ("RL still learning user behavior" if (const_std_err is None or const_std_err > 0.1)
                    else "RL activated")
                # Send a single intermediate event with RL status and detected domain.
                yield _sse_event({ "rl_status": const_rl_status, "domain": current_domain })
                # Then, send the final response event.
                yield _sse_event({ "final_response": const_query_output, "model_used": const_model_name, "domain": current_domain })
                yield _sse_event({ "step": "end", "message": "end-of-stream" })
                return;
        except Exception as e:
            yield _sse_event({ "error": str(e) })
    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/get_ranges",include_in_schema=False)
async def get_ranges(db: Session = Depends(get_db)):
    from app.db.models import ModelMetadata
    import math

    cost_min_rec = db.query(ModelMetadata).order_by(ModelMetadata.cost.asc()).first()
    cost_max_rec = db.query(ModelMetadata).order_by(ModelMetadata.cost.desc()).first()
    cost_min = cost_min_rec.cost if cost_min_rec else 0.0
    cost_max = cost_max_rec.cost if cost_max_rec else 10.0

    perf_min_rec = db.query(ModelMetadata).order_by(ModelMetadata.performance.asc()).first()
    perf_max_rec = db.query(ModelMetadata).order_by(ModelMetadata.performance.desc()).first()
    perf_min = perf_min_rec.performance if perf_min_rec else 0.0
    perf_max = perf_max_rec.performance if perf_max_rec else 1.0

    lat_min_rec = db.query(ModelMetadata).order_by(ModelMetadata.latency.asc()).first()
    lat_max_rec = db.query(ModelMetadata).order_by(ModelMetadata.latency.desc()).first()
    lat_min = lat_min_rec.latency if lat_min_rec else 0.0
    lat_max = lat_max_rec.latency if lat_max_rec else 1.0

    return {
        "cost_min": math.floor(cost_min),
        "cost_max": math.ceil(cost_max),
        "performance_min": math.floor(perf_min),
        "performance_max": math.ceil(perf_max),
        "latency_min": math.floor(lat_min),
        "latency_max": math.ceil(lat_max)
    }
