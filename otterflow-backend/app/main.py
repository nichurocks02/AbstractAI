# app/main.py

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
import os
import sys
sys.path.append("../")
from app.db.models import Base
from app.db.database import engine
from app.routes.auth import router as auth_router
from app.routes.wallet import router as wallet_router
from app.routes.api_keys import router as api_keys_router
from app.routes.queries import router as queries_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# Mount the directory as a static file route
upload_dir = "uploaded_avatars"
os.makedirs(upload_dir, exist_ok=True)  # Ensure the directory exists
app = FastAPI()
# Mount the uploaded_avatars directory
app.mount("/uploaded_avatars", StaticFiles(directory=upload_dir), name="uploaded_avatars")

# Allow all origins (or adjust to your needs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:3000"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Load environment variables from .env file
load_dotenv()

# Create all database tables
Base.metadata.create_all(bind=engine)
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



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
