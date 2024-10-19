from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from dotenv import load_dotenv
import os
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

# Fetch the PostgreSQL database URL from environment variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Set up the SQLAlchemy engine for PostgreSQL
engine = create_engine(DATABASE_URL)

Base = declarative_base()

# User model for storing user information
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)  # PostgreSQL requires autoincrement
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # One-to-one relationship with Wallet
    wallet = relationship("Wallet", uselist=False, back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")

# APIKey model with proper relationship
class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, autoincrement=True)  # PostgreSQL
    key = Column(String, unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    api_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")

# Wallet model for storing user balances
class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)  # PostgreSQL
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    balance = Column(Integer, default=500)  # Default balance in cents ($5)

    # Relationship back to the user
    user = relationship("User", back_populates="wallet")

# Create database tables in PostgreSQL
Base.metadata.create_all(engine)
