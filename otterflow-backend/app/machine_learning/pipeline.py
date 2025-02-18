# app/machine_learning/pipeline.py

import openai
from openai import OpenAI
from openai import AsyncOpenAI
import os
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from math import sqrt
# Import your DB model
from app.db.models import ModelMetadata, UserBanditStats

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

#Import llm function calls
from app.llm.openai_query import handle_openai_query_async
from app.llm.groq_query import handle_groq_query_async
from app.llm.google_query import handle_google_query_async
from app.llm.aimlapi_query import handle_aiml_query_async
from app.llm.cohere_query import handle_cohere_query_async
import random
from datetime import datetime, timezone


# -------------------------------------------
# 0. Domain detection & similarity
# -------------------------------------------
async_client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

async def detect_domain_via_openai(
    user_query: str,
    wallet,          # user.wallet
    db: Session,
    possible_domains=None
) -> str:
    """
    Calls gpt-3.5-turbo via async_client to classify 'user_query' into exactly one
    domain from a predefined list. Returns that domain as a string.

    We'll do a bigger domain list for diversity, e.g.:
      ["math","coding","science","finance","sports","history","geography","entertainment","politics","other"]

    COST:
      - gpt-3.5-turbo cost:
        $3 per million input tokens => $0.003 per 1k input tokens
        $6 per million output tokens => $0.006 per 1k output tokens
    We'll measure usage from the openai usage metadata and deduct from wallet.
    """
    if not possible_domains:
        possible_domains = [
            "math","coding","science","finance","sports",
            "history","geography","entertainment","politics","other"
        ]

    # The system prompt or user message telling GPT how to respond
    prompt_content = f"""
    You are a domain classifier. You will receive a user query.
    You must return valid JSON with exactly one key "domain".
    The value must be exactly one string from this list:
    {possible_domains}.

    If you cannot decide, pick "other".

    User query:
    \"\"\"{user_query}\"\"\"
    """

    # Make the chat completion call
    try:
        response = await async_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a domain classifier."},
                {"role": "user", "content": prompt_content.strip()}
            ],
            temperature=0.0
        )
    except Exception as e:
        print(f"[detect_domain_via_openai] Error calling GPT-3.5: {e}")
        return "other"

    # Extract usage info to calculate cost
    usage = response.usage  # { "prompt_tokens": int, "completion_tokens": int, ... }
    prompt_tokens = usage.prompt_tokens
    completion_tokens = usage.completion_tokens

    # Cost calculation
    # $3 per million => $0.003 per 1k input tokens
    # $6 per million => $0.006 per 1k output tokens
    input_cost = (prompt_tokens / 1000.0) * 0.003
    output_cost = (completion_tokens / 1000.0) * 0.006
    total_cost = input_cost + output_cost

    if wallet.balance < total_cost:
        raise HTTPException(status_code=400, detail="Insufficient balance for domain detection.")
    wallet.balance -= total_cost
    db.add(wallet)
    db.commit()

    text_out = response.choices[0].message.content.strip()
    try:
        classification = json.loads(text_out)
        domain_val = classification.get("domain", "other")
        if domain_val not in possible_domains:
            domain_val = "other"
    except Exception as e:
        print(f"[detect_domain_via_openai] JSON parse error: {e}")
        domain_val = "other"

    return domain_val



def are_queries_similar(q1: str, q2: str, threshold=0.7) -> bool:
    """
    A stricter similarity function for re-query detection.
    If sim >= 0.7 => consider them "the same" question.
    """
    if not q1 or not q2:
        return False
    vectorizer = TfidfVectorizer().fit([q1, q2])
    tfidf = vectorizer.transform([q1, q2])
    sim = cosine_similarity(tfidf[0], tfidf[1])[0][0]
    return sim >= threshold



# -------------------------------------------
# 1. RL Manager (user-based)
# -------------------------------------------
class UserBanditStatsManager:
    """
    Per-user, per-domain, per-model bandit stats.
    """

    def get_avg_reward(self, db: Session, user_id: int, model_name: str, domain_label: str) -> float:
        record = (
            db.query(UserBanditStats)
            .filter_by(user_id=user_id, model_name=model_name, domain_label=domain_label)
            .first()
        )
        if not record or record.count == 0:
            return 0.0
        return record.cumulative_reward / record.count

    def update_reward(self, db: Session, user_id: int, model_name: str, domain_label: str, reward: float):
        record = (
            db.query(UserBanditStats)
            .filter_by(user_id=user_id, model_name=model_name, domain_label=domain_label)
            .first()
        )
        if not record:
            record = UserBanditStats(
                user_id=user_id,
                model_name=model_name,
                domain_label=domain_label,
                cumulative_reward=reward,
                count=1,
                sum_rewards_squared=reward**2,
                updated_at=datetime.utcnow()
            )
            db.add(record)
        else:
            record.cumulative_reward += reward
            record.count += 1
            record.sum_rewards_squared += reward**2
        record.updated_at = datetime.utcnow()
        db.commit()

    def get_standard_error(self, db: Session, user_id: int, model_name: str, domain_label: str) -> Optional[float]:
        record = (
            db.query(UserBanditStats)
            .filter_by(user_id=user_id, model_name=model_name, domain_label=domain_label)
            .first()
        )
        if not record or record.count < 2:
            return None
        variance = (record.sum_rewards_squared - (record.cumulative_reward ** 2) / record.count) / (record.count - 1)
        std_error = sqrt(variance) / sqrt(record.count)
        return std_error

    def epsilon_greedy_selection(
        self,
        db: Session,
        user_id: int,
        candidates: List[dict],
        domain_label: str,
        epsilon=0.1,
        std_err_threshold=0.1
    ) -> dict:
        if not candidates:
            raise ValueError("No candidates to choose from")

        # Determine best candidate by avg reward
        best_candidate = None
        best_avg = float("-inf")
        best_std_err = None

        for c in candidates:
            avg_reward = self.get_avg_reward(db, user_id, c["model_name"], domain_label)
            std_err = self.get_standard_error(db, user_id, c["model_name"], domain_label)
            if std_err is None:
                std_err = float("inf")
            if avg_reward > best_avg:
                best_avg = avg_reward
                best_candidate = c
                best_std_err = std_err

        # If uncertain, fallback to top candidate by final_score
        if best_std_err is None or best_std_err > std_err_threshold:
            return candidates[0]

        # Otherwise, epsilon-greedy
        if random.random() < epsilon:
            return random.choice(candidates)
        else:
            return best_candidate

bandit_manager = UserBanditStatsManager()

#####################################################
# 2. Predict Model from DB                          #
#####################################################
def predict_model_from_db(
    db: Session,
    user_input: dict,
    user_query: str = None,
    alpha: float = 0.33,
    beta: float = 0.33,
    gamma: float = 0.34,
    top_k: int = 3
):
    """
    Filters models by cost/performance/lat constraints, normalizes, 
    returns top_k sorted by final_score.
    """
    print(f"User input {user_input}")
    cost_max = user_input.get("cost_max", None)
    if cost_max is not None:
        try:
            cost_max = float(cost_max)
        except ValueError:
            cost_max = None
    print(f"cost max : {cost_max}")

    perf_min = user_input.get("perf_min", None)
    if perf_min is not None:
        try:
            perf_min = float(perf_min)
        except ValueError:
            perf_min = None

    lat_max = user_input.get("lat_max", None)
    if lat_max is not None:
        try:
            lat_max = float(lat_max)
        except ValueError:
            lat_max = None

    all_models = db.query(ModelMetadata).all()
    if not all_models:
        raise HTTPException(status_code=404, detail="No models found in DB.")

    # Filter
    filtered = []
    for m in all_models:
        model_cost = round(m.cost, 2)
        if cost_max is not None and model_cost > cost_max:
            continue
        if perf_min is not None and m.performance < perf_min:
            continue
        if lat_max is not None and m.latency > lat_max:
            continue
        filtered.append(m)

    if not filtered:
        return []

    min_cost = min(m.cost for m in filtered)
    max_cost = max(m.cost for m in filtered) or 1.0
    min_perf = min(m.performance for m in filtered)
    max_perf = max(m.performance for m in filtered) or 1.0
    min_lat  = min(m.latency for m in filtered)
    max_lat  = max(m.latency for m in filtered) or 1.0

    results = []
    for m in filtered:
        cost_norm = (m.cost - min_cost) / (max_cost - min_cost) if (max_cost - min_cost) != 0 else 0.0
        perf_norm = (m.performance - min_perf) / (max_perf - min_perf) if (max_perf - min_perf) != 0 else 0.0
        lat_norm  = (m.latency - min_lat) / (max_lat - min_lat) if (max_lat - min_lat) != 0 else 0.0

        # Lower cost & latency => higher score
        cost_score = 1 - cost_norm
        lat_score  = 1 - lat_norm
        perf_score = perf_norm

        final_score = alpha*cost_score + beta*perf_score + gamma*lat_score
        results.append({
            "model_name": m.model_name,
            "license": m.license,
            "final_score": final_score,
            "cost": m.cost,
            "performance": m.performance,
            "latency": m.latency,
            "input_cost_raw": m.input_cost_raw,
            "output_cost_raw": m.output_cost_raw
        })

    results.sort(key=lambda x: x["final_score"], reverse=True)
    print("Top k models are:")
    print(results[:top_k])
    return results[:top_k]

#####################################################
# 3. Sending Query & Fallback Logic                 #
#####################################################
async def send_query_to_model(user_query: str, chosen_model: dict, **kwargs):
    """
    Query the chosen model. Then we can do cost calc or rely on usage metadata 
    from each LLM function (like handle_openai_query_async).
    Return a dict with 'query_output', etc.
    """
    license_type = chosen_model.get("license", "Unknown")
    model_name = chosen_model.get("model_name")

    if license_type == "OpenAI":
        try:
            # uses handle_openai_query_async which uses 'async_client' under the hood
            raw_response = await handle_openai_query_async(user_query, model_name, **kwargs)
            query_output = raw_response.choices[0].message.content
            completion_tokens = int(raw_response.usage.completion_tokens)
            total_tokens = int(raw_response.usage.total_tokens)
            return {
                "model_name": model_name,
                "license_type": license_type,
                "user_query": user_query,
                "query_output": query_output,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "raw_response": raw_response
            }
        except Exception as e:
            print(f"OpenAI query error: {e}")
            raise

    elif license_type == "Groq":
        try:
            raw_response = await handle_groq_query_async(user_query, model_name, **kwargs)
            query_output = raw_response.choices[0].message.content
            completion_tokens = int(raw_response.usage.completion_tokens)
            total_tokens = int(raw_response.usage.total_tokens)
            return {
                "model_name": model_name,
                "license_type": license_type,
                "user_query": user_query,
                "query_output": query_output,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "raw_response": raw_response
            }
        except Exception as e:
            print(f"Groq query error: {e}")
            raise

    elif license_type == "Opensource":
        try:
            raw_response = await handle_aiml_query_async(user_query, model_name, **kwargs)
            query_output = raw_response["choices"][0]["message"]["content"]
            completion_tokens = raw_response["usage"]["completion_tokens"]
            total_tokens = raw_response["usage"]["total_tokens"]
            return {
                "model_name": model_name,
                "license_type": license_type,
                "user_query": user_query,
                "query_output": query_output,
                "completion_tokens": int(completion_tokens),
                "total_tokens": int(total_tokens),
                "raw_response": raw_response
            }
        except Exception as e:
            print(f"Opensource query error: {e}")
            raise

    elif license_type == "Google":
        try:
            raw_response = await handle_google_query_async(user_query, model_name, **kwargs)
            query_output = raw_response._result.candidates[0].content.parts[0].text
            completion_tokens = int(raw_response._result.usage_metadata.candidates_token_count)
            total_tokens = int(raw_response._result.usage_metadata.total_token_count)
            return {
                "model_name": model_name,
                "license_type": license_type,
                "user_query": user_query,
                "query_output": query_output,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "raw_response": raw_response
            }
        except Exception as e:
            print(f"Google query error: {e}")
            raise

    elif license_type == "Cohere":
        try:
            raw_response = await handle_cohere_query_async(user_query, model_name, **kwargs)
            query_output = raw_response["message"]["context"][0]["text"]
            completion_tokens = int(raw_response["usage"]["tokens"]["output_tokens"])
            total_tokens = int(raw_response["usage"]["tokens"]["input_tokens"]) + completion_tokens
            return {
                "model_name": model_name,
                "license_type": license_type,
                "user_query": user_query,
                "query_output": query_output,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
                "raw_response": raw_response
            }
        except Exception as e:
            print(f"Cohere query error: {e}")
            raise

    else:
        raise HTTPException(status_code=400, detail=f"Unknown license type: {license_type}")


async def route_with_fallback(user_query: str, candidates: list, max_attempts=3, **kwargs):
    """
    Attempts each candidate (ordered list) up to max_attempts. 
    Returns first success, or raises if all fail.
    """
    attempts = 0
    for candidate in candidates[:max_attempts]:
        attempts += 1
        try:
            response = await send_query_to_model(user_query, candidate, **kwargs)
            return response
        except Exception as e:
            print(f"Attempt {attempts} failed for {candidate['model_name']}: {e}")
            continue

    raise HTTPException(status_code=500, detail="All candidate models failed during fallback.")