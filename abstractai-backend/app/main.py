# app/main.py

from fastapi import FastAPI, Request, HTTPException
from dotenv import load_dotenv
import os
from app.db.models import Base
from app.db.database import engine
from app.routes.auth import router as auth_router
from app.routes.wallet import router as wallet_router
from app.routes.api_keys import router as api_keys_router
from app.routes.queries import router as queries_router

# Load environment variables from .env file
load_dotenv()

# Create all database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI()

# Initialize session store in application state
app.state.session_store = {}

# Include routers from different modules
app.include_router(auth_router)
app.include_router(wallet_router)
app.include_router(api_keys_router)
app.include_router(queries_router)

# Root route
@app.get("/")
async def root():
    return {"message": "Welcome to AbstractAI Backend!"}

# Logout route
@app.get("/logout")
async def logout(request: Request):
    request.app.state.session_store.pop(request.client.host, None)
    return {"message": "Successfully logged out"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
