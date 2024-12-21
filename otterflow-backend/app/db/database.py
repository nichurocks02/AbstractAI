# app/db/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Fetch the PostgreSQL database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Set up the SQLAlchemy engine for PostgreSQL
engine = create_engine(DATABASE_URL)

# Create a sessionmaker object to create sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
