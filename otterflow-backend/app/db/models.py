# app/db/models.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime,Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from app.db.database import engine 
Base = declarative_base()




class ModelMetadata(Base):
    __tablename__ = "model_metadata"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String, unique=True, nullable=False)
    license = Column(String, nullable=False)
    window = Column(String, nullable=False)

    # Normalized columns in [0..1]
    cost = Column(Float, nullable=True)
    latency = Column(Float, nullable=True)
    performance = Column(Float, nullable=True)

    # Category scores in [0..1]
    math_score = Column(Float, nullable=True)
    coding_score = Column(Float, nullable=True)
    gk_score = Column(Float, nullable=True)  # "general knowledge"

    # Original price columns for cost calculation
    input_cost_raw = Column(Float, nullable=True)   # e.g. $2.50 per million
    output_cost_raw = Column(Float, nullable=True)

# app/db/models.py (expanded)
class ModelUsage(Base):
    __tablename__ = "model_usage"
    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String, nullable=False)
    input_tokens = Column(Integer, nullable=False)
    output_tokens = Column(Integer, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


# User model for storing user information
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)  # PostgreSQL requires autoincrement
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_email_verified = Column(Boolean, default=False)  # New field for email verification
    auth_method = Column(String, nullable=False, default='email')  # New field to distinguish auth methods
    password = Column(String, nullable=True)  # Made nullable to accommodate Google OAuth users
    avatar = Column(String, nullable=True)  # New column for avatar
    # One-to-one relationship with Wallet
    wallet = relationship("Wallet", uselist=False, back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")
    query_logs = relationship("QueryLog", back_populates="user")
    otps = relationship("OTP", back_populates="user")  # Relationship to OTP

# OTP model for email verification and password reset
class OTP(Base):
    __tablename__ = "otps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(String, nullable=False)
    purpose = Column(String, nullable=False)  # 'email_verification' or 'password_reset'
    expires_at = Column(DateTime, nullable=False)

    user = relationship("User", back_populates="otps")

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

# Assuming Base and engine have already been defined

class QueryLog(Base):
    __tablename__ = "query_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chat_window_id = Column(Integer, nullable=False)  # Chat window ID to group by topic
    query_input = Column(Text, nullable=False)        # Store the input query text
    query_output = Column(Text, nullable=True)        # Store the model output
    tokens_used = Column(Integer, nullable=False)     # Number of tokens processed
    cost = Column(Float, nullable=False)              # Cost of the query
    latency = Column(Float, nullable=True)            # Query processing latency
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="query_logs")

