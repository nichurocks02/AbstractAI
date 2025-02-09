# app/machine_learning/pipeline.py

import openai
from openai import OpenAI
import os
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session
from typing import Optional

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


# -------------------------------------------
# 0. Domain detection & similarity
# -------------------------------------------
def detect_domain(user_query: str, previous_query: Optional[str] = None) -> str:
    """
    If previous_query is given, compute a simple TF-IDF similarity.
    If sim >= 0.5 => 'same_domain', else 'new_domain'.
    Real production might do embeddings, etc.
    """
    if not previous_query:
        return "new_domain"

    vectorizer = TfidfVectorizer().fit([user_query, previous_query])
    tfidf = vectorizer.transform([user_query, previous_query])
    sim = cosine_similarity(tfidf[0], tfidf[1])[0][0]
    if sim >= 0.5:
        return "same_domain"
    else:
        return "new_domain"


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

#####################################################
# 1. Zero-shot classification                       #
#####################################################
'''
def classify_query_zero_shot(user_query: str):
    """
    Perform a multi-label classification of user_query into 4 categories:
      [ 'math', 'coding', 'general knowledge', 'other' ]

    Return a dict with probabilities for each category, e.g.:
      {"math": 0.3, "coding": 0.5, "general knowledge": 0.2, "other": 0.0}

    - If the call fails, or we can't parse JSON, fallback to
      {"math": 0.0, "coding": 0.0, "general knowledge": 0.0, "other": 1.0}.
    - Categories may partially overlap; the sum of probabilities can be
      <= 1, > 1, or = 1.
    """
    categories = ["math", "coding", "general knowledge", "other"]

    prompt = f"""
    You are a multi-label classifier. For the user query below, 
    assign a probability (0.0 to 1.0) to each of these categories:
    {categories}.

    The sum of probabilities can be any number, because multiple
    categories can overlap. Return valid JSON with these four keys.

    Query: \"\"\"{user_query}\"\"\"
    """

    # Fallback distribution if there's any exception
    fallback = {"math": 0.0, "coding": 0.0, "general knowledge": 0.0, "other": 0.5}

    try:
        # Create an OpenAI client. You might instead set openai.api_key directly.
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        # Use the chat completion endpoint
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
        )

        # Parse the JSON returned in the message
        content = response.choices[0].message.content.strip()
        classification = json.loads(content)

        # Ensure all 4 categories exist
        for cat in categories:
            if cat not in classification:
                classification[cat] = 0.0

        print(f"classification: {classification}")
        return classification

    except Exception as e:
        print(f"[classify_query_zero_shot] Exception: {e}")
        return fallback
'''



#####################################################
# 2. Predict Model from DB                          #
#####################################################
def predict_model_from_db(
    db: Session,
    user_input: dict,
    user_query: str = None,
    alpha: float = 0.33,  # cost priority
    beta: float = 0.33,   # performance priority
    gamma: float = 0.34,  # latency priority
    top_k: int = 3
):
    """
    1) Zero-shot classification to find domain relevance (math, coding, gk).
    2) Filter models by user constraints (cost, performance, latency).
    3) Score each model with a multi-criteria function:
       domain_blend * base_perf + (1 - domain_blend) * domain_score => final_perf
       cost_score = 1 - normed_cost
       lat_score  = 1 - normed_latency
       perf_score = normed_final_perf
       final_score = alpha*cost_score + beta*perf_score + gamma*lat_score
    4) Sort descending, pick top_k.
    """

    from app.db.models import ModelMetadata
    from fastapi import HTTPException

    # Retrieve all models from DB
    all_models = db.query(ModelMetadata).all()
    if not all_models:
        raise HTTPException(status_code=404, detail="No models found in DB.")

    # Extract constraints from user_input
    cost_max = user_input.get("cost_max", None)
    perf_min = user_input.get("perf_min", None)
    lat_max = user_input.get("lat_max", None)

    # Filter models based on constraints
    filtered = []
    for m in all_models:
        if cost_max is not None and m.cost > cost_max:
            continue
        if perf_min is not None and m.performance < perf_min:
            continue
        if lat_max is not None and m.latency > lat_max:
            continue
        filtered.append(m)

    if not filtered:
        return []

    # Compute min/max among filtered models for normalization
    min_cost = min(m.cost for m in filtered)
    max_cost = max(m.cost for m in filtered) or 1.0
    min_perf = min(m.performance for m in filtered)
    max_perf = max(m.performance for m in filtered) or 1.0
    min_lat  = min(m.latency for m in filtered)
    max_lat  = max(m.latency for m in filtered) or 1.0

    results = []
    for m in filtered:
        # Normalize cost, performance, and latency scores
        cost_norm = (m.cost - min_cost) / (max_cost - min_cost) if max_cost - min_cost != 0 else 0.0
        # Directly use model performance since classification is removed
        perf_norm = (m.performance - min_perf) / (max_perf - min_perf) if max_perf - min_perf != 0 else 0.0
        lat_norm = (m.latency - min_lat) / (max_lat - min_lat) if max_lat - min_lat != 0 else 0.0

        # We want lower cost and latency, so higher scores when these are low
        cost_score = 1 - cost_norm
        lat_score = 1 - lat_norm
        # We want higher performance, so higher score when performance is high
        perf_score = perf_norm

        # Combine scores using user-defined weights
        final_score = alpha * cost_score + beta * perf_score + gamma * lat_score

        results.append({
            "model_name": m.model_name,
            "license": m.license,
            "final_score": final_score,
            "cost": m.cost,
            "performance": m.performance,
            "latency": m.latency,
            "math_score": m.math_score,
            "coding_score": m.coding_score,
            "gk_score": m.gk_score,
            "input_cost_raw": m.input_cost_raw,      # Added field
            "output_cost_raw": m.output_cost_raw
        })
    print("results before sorting")
    print(results[:top_k])
    # Sort results by final_score in descending order
    results.sort(key=lambda x: x["final_score"], reverse=True)
    print("**********New results***********")
    print(results[:top_k])
    return results[:top_k]


#####################################################
# 3. Sending Query & Fallback Logic                 #
#####################################################
async def send_query_to_model(user_query: str, chosen_model: dict, **kwargs):
    """
    Asynchronously route the query to the correct handler based on the model's license.
    """
    license_type = chosen_model.get("license", "Unknown")
    model_name = chosen_model.get("model_name")

    if license_type == "OpenAI":
        try:
            raw_response = await handle_openai_query_async(user_query, model_name, **kwargs)
            print(type)
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
            print(f"OpenAI query error: {e}")
            raise

    elif license_type == "Opensource":
        try:
            raw_response = await handle_aiml_query_async(user_query, model_name, **kwargs)
            # Access the fields correctly as a dictionary
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




async def route_with_fallback(user_query: str, candidates: list, max_attempts=3, **kwargs):
    """
    Asynchronously try multiple candidate models in descending order of score.
    """
    attempts = 0
    for candidate in candidates:
        attempts += 1
        try:
            response = await send_query_to_model(user_query, candidate, **kwargs)
            return response
        except Exception as e:
            print(f"Attempt {attempts} failed for model {candidate}:")
            print(e)
            continue

    raise HTTPException(status_code=500, detail="All candidate models failed during fallback.")
