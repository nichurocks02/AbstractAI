from fastapi import FastAPI, Depends, Request, HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session as SessionType
from app.db.models import Base, User, APIKey, Wallet
from app.utility.utility import generate_unique_api_key, cost_per_query
from datetime import datetime
from dotenv import load_dotenv
import os
import stripe
from typing import List
from pydantic import BaseModel
from transformers import GPT2Tokenizer
from app.machine_learning.pipeline import predict_model, load_and_preprocess_data
from jose import jwt
from fastapi.security import OAuth2PasswordBearer
import requests
# Load environment variables from .env file
load_dotenv()

# Initialize Stripe API key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Fetch the PostgreSQL database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Create a SQLAlchemy engine for PostgreSQL
engine = create_engine(DATABASE_URL)

# Create a sessionmaker object to create sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Initialize FastAPI app
app = FastAPI()

# OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# In-memory session store (not for production)
session_store = {}

# Default wallet balance for new users
DEFAULT_WALLET_BALANCE = 500  # $5.00 in cents

# Load preprocessed data for machine learning models
preprocessed_file_path = "./app/machine_learning/model_info/models_2024_aug.csv"
preprocessed_data = load_and_preprocess_data(preprocessed_file_path)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic model for APIKey output
class APIKeyOut(BaseModel):
    key: str
    api_name: str
    is_active: bool
    created_at: datetime

    class Config:
        orm_mode = True
        from_attributes = True

# Google login route
@app.get("/login/google")
async def login_google():
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    return {
        "url": f"https://accounts.google.com/o/oauth2/auth?response_type=code&client_id={google_client_id}&redirect_uri={google_redirect_uri}&scope=openid%20profile%20email&access_type=offline"
    }

# Google OAuth and wallet creation
@app.get("/auth/google")
async def auth_google(code: str, request: Request, db: SessionType = Depends(get_db)):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    token_url = "https://accounts.google.com/o/oauth2/token"
    data = {
        "code": code,
        "client_id": google_client_id,
        "client_secret": google_client_secret,
        "redirect_uri": google_redirect_uri,
        "grant_type": "authorization_code",
    }

    try:
        response = requests.post(token_url, data=data)
        response.raise_for_status()
        access_token = response.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Access token not received")
        user_info = requests.get(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_info.raise_for_status()
        user_info = user_info.json()

        # Check if the user exists, otherwise create one and assign free credit
        user = db.query(User).filter_by(email=user_info["email"]).first()

        if not user:
            # Create a new user
            user = User(email=user_info["email"], name=user_info["name"])
            db.add(user)
            db.commit()
            db.refresh(user)

            # Initialize wallet with $5 free credit
            wallet = Wallet(user_id=user.id, balance=DEFAULT_WALLET_BALANCE)
            db.add(wallet)
            db.commit()
            db.refresh(wallet)

        # Store user session
        session_store[request.client.host] = user.id

        return {"message": "Login successful", "user": user_info}

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Home route to display user wallet balance
@app.get("/")
async def home(request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet_balance = user.wallet.balance if user.wallet else 0
    return {"message": f"Welcome home, {user.name}. Your wallet balance is {wallet_balance / 100:.2f} USD."}

# Generate API key with wallet balance check
@app.post("/generate-api")
async def generate_api_key_endpoint(api_name: str, request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = user.wallet
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")

    if wallet.balance < 100:  # $1.00 in cents
        raise HTTPException(status_code=400, detail="Insufficient balance in wallet")

    # Check if api_name is unique for this user
    existing_api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()
    if existing_api_key:
        raise HTTPException(status_code=400, detail="API name already exists for this user")

    # Generate API key and deduct from wallet
    api_key_value = generate_unique_api_key()
    api_key = APIKey(
        key=api_key_value,
        user_id=user.id,
        api_name=api_name,
        is_active=True,
        created_at=datetime.utcnow()
    )

    # Deduct $1 from wallet
    wallet.balance -= 100
    db.add(api_key)
    db.commit()
    db.refresh(api_key)

    return {"api_key": api_key_value, "status": "active", "wallet_balance": wallet.balance}

# Wallet recharge route
@app.post("/wallet/recharge")
async def recharge_wallet(amount: int, request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = user.wallet
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")

    body = await request.json()
    token = body.get("token")

    if not token:
        raise HTTPException(status_code=400, detail="Payment token is missing")

    try:
        # Charge the user (amount should be in cents)
        charge = stripe.Charge.create(
            amount=amount * 100,  # amount in cents
            currency="usd",
            source=token,
            description=f"Wallet recharge for {user.name}"
        )

        # Update wallet balance after successful payment
        wallet.balance += amount * 100
        db.commit()

        return {"message": "Wallet recharge successful", "wallet_balance": wallet.balance}

    except stripe.error.StripeError as e:
        db.rollback()  # Rollback on Stripe error
        raise HTTPException(status_code=400, detail=f"Payment failed: {str(e)}")

# Get wallet balance
@app.get("/wallet/balance")
async def get_wallet_balance(request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet_balance = user.wallet.balance if user.wallet else 0
    return {"wallet_balance": wallet_balance}

# Handle user query and calculate cost based on model prediction
@app.post("/query/")
async def handle_user_query(user_query: str, user_input: dict, request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    wallet = user.wallet
    if not wallet or wallet.balance <= 0:
        raise HTTPException(status_code=402, detail="Insufficient balance")

    tokenizer = GPT2Tokenizer.from_pretrained("gpt2")

    # Get predicted model
    predicted_model = predict_model(user_input, preprocessed_data)

    # Calculate input and output tokens
    num_input_tokens = len(tokenizer.encode(user_input))
    model_response = send_query_to_model(user_query, predicted_model)
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

# OAuth2 token route
@app.get("/token")
async def get_token_endpoint(token: str = Depends(oauth2_scheme)):
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    try:
        decoded = jwt.decode(token, google_client_secret, algorithms=["HS256"])
        return decoded
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Update API key status
@app.put("/api-key/{api_name}/status")
async def update_api_key_status(api_name: str, is_active: bool, request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Check if user has sufficient wallet balance if activating
    if is_active and user.wallet.balance < 0:
        raise HTTPException(status_code=402, detail="Insufficient wallet balance to activate the API key")

    api_key.is_active = is_active
    db.commit()

    return {"message": f"API key status updated to {'active' if is_active else 'inactive'}"}

# Revoke API key
@app.delete("/api-key/{api_name}")
async def revoke_api_key(api_name: str, request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Revoke the API key by setting is_active to False
    api_key.is_active = False
    db.commit()

    return {"message": "API key revoked", "status": "inactive"}

# Delete API key
@app.delete("/api-key/{api_name}/delete")
async def delete_api_key(api_name: str, request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    api_key = db.query(APIKey).filter_by(user_id=user.id, api_name=api_name).first()

    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")

    # Delete the API key
    db.delete(api_key)
    db.commit()

    return {"message": "API key deleted"}

# List API keys with wallet balance
@app.get("/api-keys")
async def list_api_keys_endpoint(request: Request, db: SessionType = Depends(get_db)):
    user_id = session_store.get(request.client.host)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    user = db.query(User).get(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    api_keys = db.query(APIKey).filter_by(user_id=user.id).all()

    if not api_keys:
        raise HTTPException(status_code=404, detail="No API keys found for this user")

    return {"api_keys": [APIKeyOut.from_orm(k) for k in api_keys], "wallet_balance": user.wallet.balance}

# Logout route
@app.get("/logout")
async def logout(request: Request):
    session_store.pop(request.client.host, None)
    return {"message": "Successfully logged out"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
