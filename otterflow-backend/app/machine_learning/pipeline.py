# app/machine_learning/pipeline.py

import openai
import json
from fastapi import HTTPException
from sqlalchemy.orm import Session

# Import your DB model
from app.db.models import ModelMetadata

#####################################################
# 1. Zero-shot classification                       #
#####################################################
def classify_query_zero_shot(user_query: str):
    """
    Classify user_query into four categories:
    'math', 'coding', 'general knowledge', 'other'.
    Return a dict with probabilities for each category, e.g.:
    {
      "math": 0.5,
      "coding": 0.2,
      "general knowledge": 0.1,
      "other": 0.2
    }
    If the call fails, fallback to {"math": 0.0, "coding": 0.0, "general knowledge": 0.0, "other": 1.0}.
    """
    categories = ["math", "coding", "general knowledge", "other"]
    prompt = f"""
    You are a specialized classifier. Classify the following user query 
    into these categories: {categories}. Return a JSON object mapping 
    each category to a probability (0.0 to 1.0).

    Query: {user_query}
    """
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )
        content = response["choices"][0]["message"]["content"]
        classification = json.loads(content)
    except Exception:
        classification = {"math": 0.0, "coding": 0.0, "general knowledge": 0.0, "other": 1.0}

    for cat in categories:
        if cat not in classification:
            classification[cat] = 0.0
    return classification


#####################################################
# 2. Predict Model from DB                          #
#####################################################
def predict_model_from_db(
    db: Session,
    user_input: dict,
    user_query: str = None,
    alpha: float = 0.5,
    top_k: int = 3
):
    """
    DB-based approach to get top-k models.
    
    1. (Optionally) Zero-shot classify user_query -> category_probs
    2. Query ModelMetadata from DB
    3. Weighted sum approach:
         final_score = cost_pref*(1 - cost) + 
                       perf_pref*(perf_cat) + 
                       lat_pref*(1 - latency)
       where perf_cat = alpha*performance + (1-alpha)*category_score
    4. Sort descending, return top_k
    5. We'll store raw input/output cost in the output for billing

    user_input example: {"Cost":8, "Performance":9, "latency":2} on 0..10 scale
    """

    # 2.1 Classification if user_query is provided
    category_probs = {"math":0,"coding":0,"general knowledge":0,"other":1}
    if user_query:
        classification = classify_query_zero_shot(user_query)
        category_probs = classification

    # If no real match => alpha=1 => rely entirely on overall performance
    sum_specific = category_probs["math"] + category_probs["coding"] + category_probs["general knowledge"]
    if sum_specific < 0.01:
        alpha = 1.0

    # 2.2 Query all models from DB
    all_models = db.query(ModelMetadata).all()

    # 2.3 Convert user_input from [0..10] -> [0..1]
    cost_pref = user_input["Cost"] / 10.0
    perf_pref = user_input["Performance"] / 10.0
    lat_pref = user_input["latency"] / 10.0

    results = []
    for m in all_models:
        # cost, latency, performance are in [0..1], 
        # but we want "lower cost => better" => cost_norm = 1 - cost
        # same for latency => lat_norm = 1 - latency
        cost_norm = 1 - (m.cost or 0.0)
        lat_norm  = 1 - (m.latency or 0.0)
        base_perf = (m.performance or 0.0)

        # Weighted category score
        cat_score = (
            category_probs["math"]*(m.math_score or 0.5) +
            category_probs["coding"]*(m.coding_score or 0.5) +
            category_probs["general knowledge"]*(m.gk_score or 0.5)
        )
        perf_cat = alpha*base_perf + (1-alpha)*cat_score

        final_score = (cost_pref*cost_norm) + (perf_pref*perf_cat) + (lat_pref*lat_norm)

        results.append({
            "model_name": m.model_name,
            "final_score": final_score,
            # raw cost for token billing
            "input_cost_raw": m.input_cost_raw,
            "output_cost_raw": m.output_cost_raw
        })

    # 2.4 Sort descending by final_score, pick top_k
    results.sort(key=lambda x: x["final_score"], reverse=True)
    return results[:top_k]


#####################################################
# 3. Sending Query & Fallback Logic                 #
#####################################################
def send_query_to_model(user_query: str, chosen_model: dict) -> str:
    """
    chosen_model is a dict with keys like 'model_name', 'final_score', etc.
    Return a placeholder or call your real LLM endpoint.
    """
    return f"[Mock response from {chosen_model['model_name']}]"

def route_with_fallback(user_query: str, candidates: list, max_attempts=3):
    """
    If you have multiple candidate models in descending final_score,
    try each. If one fails, move on.
    """
    attempts = 0
    for c in candidates:
        attempts += 1
        try:
            resp = send_query_to_model(user_query, c)
            return {
                "model_name": c["model_name"],
                "response": resp,
                "attempts": attempts
            }
        except Exception:
            # Log error, go to next
            continue
    
    raise HTTPException(status_code=500, detail="All candidate models failed during fallback.")
