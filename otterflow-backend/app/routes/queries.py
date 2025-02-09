from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import json

from transformers import GPT2Tokenizer

from app.db.models import User, Wallet, QueryLog
from app.db.database import get_db, SessionLocal
from app.utility.utility import cost_per_query
from app.machine_learning.pipeline import (
    predict_model_from_db,
    route_with_fallback,
    send_query_to_model
)
from itsdangerous import URLSafeSerializer, BadSignature
import os
import math
import time
import asyncio

router = APIRouter(prefix="/query", tags=["Queries"])
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

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("/handle_user_query_stream")
async def handle_user_query_stream(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    An SSE endpoint that:
      1) Reads 'user_query' & 'user_input' from query params or request body
      2) Yields intermediate steps as SSE
      3) Yields final LLM response
    """
    # 1) Parse query parameters or body
    user_query = request.query_params.get("user_query", None)
    if not user_query:
        raise HTTPException(status_code=400, detail="Missing user_query in query params")

    user_input_str = request.query_params.get("user_input", None)
    if not user_input_str:
        raise HTTPException(status_code=400, detail="Missing user_input param")
    try:
        import json
        user_input = json.loads(user_input_str)
    except:
        raise HTTPException(status_code=400, detail="Invalid JSON for user_input")

    # 2) Check user session & wallet
    user = get_current_user_from_cookie(request, db)
    wallet = user.wallet
    if not wallet or wallet.balance <= 10:
        # Immediately yield error event
        async def error_stream():
            yield _sse_event({"error": "Insufficient balance. Please top up."})
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    # We'll define an async generator that yields SSE lines
    async def event_stream():
        try:
            # 3) "Manual" or "Auto" mode
            chosen_model_name = user_input.get("chosen_model")
            if chosen_model_name:
                # ============ Manual Mode ============

                # Step 1: Send an intermediate step about manual selection
                yield _sse_event({
                    "step": "Manual Model Selection",
                    "info": f"User chose model: {chosen_model_name}"
                })
                await asyncio.sleep(0.5)

                # Retrieve the model from DB
                from app.db.models import ModelMetadata
                chosen_model = db.query(ModelMetadata).filter_by(model_name=chosen_model_name).first()
                if not chosen_model:
                    yield _sse_event({"error": f"Model '{chosen_model_name}' not found"})
                    return  # end stream

                # Another intermediate step
                yield _sse_event({
                    "step": "Fetching model details",
                    "details": {
                        "license": chosen_model.license,
                        "cost": chosen_model.cost,
                        "latency": chosen_model.latency
                    }
                })
                await asyncio.sleep(0.5)
                start_time = time.perf_counter()
                try:
                    fallback_result = await send_query_to_model(
                        user_query=user_query,
                        chosen_model={
                            "model_name": chosen_model.model_name,
                            "license": chosen_model.license,
                            "input_cost_raw": chosen_model.input_cost_raw,
                            "output_cost_raw": chosen_model.output_cost_raw
                        }
                    )
                except Exception as e:
                    yield _sse_event({"error": f"Failed to query manual model: {str(e)}"})
                    return
                latency_measured = time.perf_counter() - start_time

                query_output = fallback_result.get("query_output")
                model_name = fallback_result.get("model_name", "unknown")
                license_type = fallback_result.get("license_type", "unknown")
                completion_tokens = fallback_result.get("completion_tokens", 0)
                total_tokens = fallback_result.get("total_tokens", 0)

                if not query_output:
                    yield _sse_event({"error": "Empty response from manual model."})
                    return

                # cost
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
                    yield _sse_event({"error": "Insufficient balance for final cost."})
                    return

                wallet.balance -= total_cost
                db.add(wallet)
                db.commit()

                # Another intermediate step: cost/latency
                yield _sse_event({
                    "step": "Cost & Latency",
                    "metrics": {
                        "latency": latency_measured,
                        "total_cost": total_cost,
                        "model_name": model_name
                    }
                })
                await asyncio.sleep(0.5)

                # final logging
                _sync_log_query(
                    user_id=user.id,
                    user_query=user_query,
                    query_output=query_output,
                    model_name=model_name,
                    license_type=license_type,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    latency=latency_measured,
                    cost=total_cost,
                    db=SessionLocal(),
                    manual=True
                )

                # 4) Yield final LLM response
                yield _sse_event({
                    "final_response": query_output,
                    "model_used": model_name
                })

            else:
                # ============ Auto Mode ============

                # Retrieve user preferences
                cost_priority = float(user_input.get("cost_priority", 1))
                accuracy_priority = float(user_input.get("accuracy_priority", 1))
                latency_priority = float(user_input.get("latency_priority", 1))
                total_priority = cost_priority + accuracy_priority + latency_priority or 1.0
                alpha = cost_priority / total_priority
                beta = accuracy_priority / total_priority
                gamma = latency_priority / total_priority

                # Step 1: yield user preference step
                yield _sse_event({
                    "step": "User Preferences",
                    "metrics": {
                        "cost_priority": cost_priority,
                        "accuracy_priority": accuracy_priority,
                        "latency_priority": latency_priority
                    }
                })

                # Step 2: predict top candidates
                from app.machine_learning.pipeline import predict_model_from_db
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
                    yield _sse_event({"error": "No models found for your constraints."})
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

                # Step 3: route with fallback
                start_time = time.perf_counter()
                from app.machine_learning.pipeline import route_with_fallback
                fallback_result = None
                try:
                    fallback_result = await route_with_fallback(
                        user_query=user_query,
                        candidates=top_candidates
                    )
                except Exception as e:
                    yield _sse_event({"error": f"Failed fallback: {str(e)}"})
                    return

                latency_measured = time.perf_counter() - start_time
                if not fallback_result or not fallback_result.get("query_output"):
                    yield _sse_event({"error": "No LLM response or empty output."})
                    return

                query_output = fallback_result["query_output"]
                model_name = fallback_result["model_name"]
                license_type = fallback_result["license_type"]
                completion_tokens = fallback_result.get("completion_tokens", 0)
                total_tokens = fallback_result.get("total_tokens", 0)

                # Step 4: which model was chosen
                yield _sse_event({
                    "step": "Chosen Model",
                    "model_name": model_name,
                    "license_type": license_type
                })

                # cost calculation
                chosen_model = next((m for m in top_candidates if m["model_name"] == model_name), None)
                if not chosen_model:
                    yield _sse_event({"error": "Chosen model data not in top candidates."})
                    return

                from transformers import GPT2Tokenizer
                tokenizer = GPT2Tokenizer.from_pretrained("gpt2")
                num_input_tokens = len(tokenizer.encode(user_query))
                num_output_tokens = len(tokenizer.encode(query_output))
                base_cost = cost_per_query(
                    chosen_model["input_cost_raw"],
                    chosen_model["output_cost_raw"],
                    num_input_tokens,
                    num_output_tokens
                )
                total_cost = base_cost * 1.15
                if wallet.balance < total_cost:
                    yield _sse_event({"error": "Insufficient balance to finalize."})
                    return
                wallet.balance -= total_cost
                db.add(wallet)
                db.commit()

                yield _sse_event({
                    "step": "Cost & Latency",
                    "metrics": {
                        "latency": latency_measured,
                        "cost": total_cost,
                        "model_name": model_name
                    }
                })

                _sync_log_query(
                    user_id=user.id,
                    user_query=user_query,
                    query_output=query_output,
                    model_name=model_name,
                    license_type=license_type,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens,
                    latency=latency_measured,
                    cost=total_cost,
                    db=SessionLocal(),
                    manual=False,
                    cost_priority=cost_priority,
                    latency_priority=latency_priority,
                    accuracy_priority=accuracy_priority
                )

                # Final SSE: return the LLM answer
                yield _sse_event({
                    "final_response": query_output,
                    "model_used": model_name
                })

        except Exception as e:
            # If we had an unexpected error, yield it
            yield _sse_event({"error": str(e)})

    # Return an SSE streaming response
    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _sse_event(data: dict) -> str:
    """
    Helper to format data as SSE text lines: "data: <json>\n\n".
    The SSE standard needs each event block to end with a double newline.
    """
    import json
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
    """
    Synchronously log the query usage in DB.
    """
    try:
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
            performance_preference=int(accuracy_priority)
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)
        print(f"[{'MANUAL' if manual else 'AUTO'}] Logged query for user {user_id}, model {model_name}")
    except Exception as e:
        print(f"Logging error: {e}")
        db.rollback()
    finally:
        db.close()

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
    cost_min = math.floor(cost_min)
    cost_max = math.ceil(cost_max)
    performance_min = math.floor(perf_min)
    performance_max = math.ceil(perf_max)
    latency_min = math.floor(lat_min)
    latency_max = math.ceil(lat_max)

    print(cost_min, cost_max, lat_min, lat_max, perf_min, perf_max)
    return {
        "cost_min": cost_min,
        "cost_max": cost_max,
        "performance_min": performance_min,
        "performance_max": performance_max,
        "latency_min": latency_min,
        "latency_max": latency_max,
    }
