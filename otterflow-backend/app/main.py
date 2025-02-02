# app/main.py

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from dotenv import load_dotenv
import os
import sys
sys.path.append("../")

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send
from starlette.responses import Response

from app.db.models import Base
from app.db.database import engine, SessionLocal
from app.routes.auth import router as auth_router
from app.routes.wallet import router as wallet_router
from app.routes.api_keys import router as api_keys_router
from app.routes.queries import router as queries_router
from app.routes.model_remote import router as models_router 
from app.routes.user_metrics import router as dashboard_router
from app.routes.admin_auth import router as admin_router
from app.routes.admin_dashboard import router as admin_dashboard
from app.routes.admin_query_logs import router as admin_query_logs
from app.routes.admin_models import router as admin_models
from app.routes.admin_emails import router as admin_emails
from app.routes.admin_users import router as admin_users
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from apscheduler.schedulers.background import BackgroundScheduler
from app.machine_learning.feedback import recompute_model_io_ratio
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


# Define the NoCacheMiddleware
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        # Set headers to prevent caching
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        response.headers["Surrogate-Control"] = "no-store"
        return response

# Add the NoCacheMiddleware to the application
app.add_middleware(NoCacheMiddleware)

def start_scheduler():
    scheduler = BackgroundScheduler()
    # Schedule the io_ratio recomputation every hour
    scheduler.add_job(lambda: recompute_model_io_ratio(SessionLocal()), 'interval', hours=0.01)
    scheduler.start()

# 3) Ingest CSV on startup
@app.on_event("startup")
def startup_event():
    """
    This function is called once when FastAPI starts.
    We ingest CSV -> DB here so we only do it once.
    """
    csv_path = os.getenv("MODEL_CSV_PATH", "./app/machine_learning/model_info/model_metrics_jan.csv")
    db = SessionLocal()
    try:
        ingest_csv_to_db(csv_path, db)
    finally:
        db.close()
    
    try:
        print("Starting scheduler for recomputing the model io ratio")
        start_scheduler()
    except Exception as e:
        print("Exception occured scheduling recompute io ratio for model data")
        print(f"Exception: {e}")


# Initialize session store in application state
app.state.session_store = {}

# Include routers
app.include_router(auth_router)
app.include_router(wallet_router)
app.include_router(api_keys_router)
app.include_router(queries_router)
app.include_router(models_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(admin_dashboard)
app.include_router(admin_query_logs)
app.include_router(admin_models)
app.include_router(admin_emails)
app.include_router(admin_users)
# Root route
@app.get("/")
async def root():
    return {"message": "Welcome to AbstractAI Backend!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
