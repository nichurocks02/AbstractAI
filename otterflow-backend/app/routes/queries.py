# app/routes/queries.py

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from app.db.models import User, Wallet
from app.db.database import get_db
from app.utility.utility import cost_per_query
from transformers import GPT2Tokenizer
from app.machine_learning.pipeline import predict_model, load_and_preprocess_data, send_query_to_model

router = APIRouter(
    prefix="/query",
    tags=["Queries"]
)

@router.post("/")
async def handle_user_query(user_query: str, user_input: dict, request: Request, db: Session = Depends(get_db)):
    user_id = request.app.state.session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = user.wallet
    if not wallet or wallet.balance <= 10:
        raise HTTPException(status_code=402, detail="Insufficient balance")

    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")

    # Load preprocessed data
    preprocessed_file_path = "./app/machine_learning/model_info/models_2024_aug.csv"
    preprocessed_data = load_and_preprocess_data(preprocessed_file_path)

    # Get predicted model
    predicted_model = predict_model(user_input, preprocessed_data)

    # Calculate input and output tokens
    num_input_tokens = len(tokenizer.encode(str(user_input)))
    model_response = send_query_to_model(user_query, predicted_model)  # Ensure this function is defined in pipeline.py
    num_output_tokens = len(tokenizer.encode(model_response))

    # Get the cost for the predicted model
    input_cost_per_million = predicted_model.iloc[0]['InputCost']
    output_cost_per_million = predicted_model.iloc[0]['OutputCost']
    total_cost = cost_per_query(input_cost_per_million, output_cost_per_million, num_input_tokens, num_output_tokens)

    # Check if wallet balance is sufficient
    if wallet.balance < total_cost:
        raise HTTPException(status_code=402, detail="Insufficient balance to process query")

    # Deduct the cost from wallet
    wallet.balance -= total_cost
    db.commit()

    return {"response": model_response, "wallet_balance": wallet.balance}
