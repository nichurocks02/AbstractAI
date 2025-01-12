# app/main.py

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
import os
import sys
sys.path.append("../")

from app.db.models import Base
from app.db.database import engine, SessionLocal
from app.routes.auth import router as auth_router
from app.routes.wallet import router as wallet_router
from app.routes.api_keys import router as api_keys_router
from app.routes.queries import router as queries_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# 1) Import your ingestion function
from app.machine_learning.ingestion import ingest_csv_to_db

# The directory for uploaded files
upload_dir = "uploaded_avatars"
os.makedirs(upload_dir, exist_ok=True)

app = FastAPI()

# Mount the uploaded_avatars directory
app.mount("/uploaded_avatars", StaticFiles(directory=upload_dir), name="uploaded_avatars")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # or restrict to your front-end domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load environment variables from .env
load_dotenv()

# 2) Create all database tables
Base.metadata.create_all(bind=engine)

# 3) Ingest CSV on startup
@app.on_event("startup")
def startup_event():
    """
    This function is called once when FastAPI starts.
    We ingest CSV -> DB here so we only do it once.
    """
    csv_path = os.getenv("MODEL_CSV_PATH", "./app/machine_learning/model_info/model_info_jan_25.csv")
    db = SessionLocal()
    try:
        ingest_csv_to_db(csv_path, db)
    finally:
        db.close()

# Initialize session store in application state
app.state.session_store = {}

# Include routers
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
