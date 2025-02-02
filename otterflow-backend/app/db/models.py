# app/db/models.py
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime,Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
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
    top_p = Column(Float,nullable=False)
    temperature = Column(Float, nullable=False)
    io_ratio = Column(Float,nullable=False)

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
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)  # Added column

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
    balance = Column(Float, default=500)  # Default balance in cents ($5)
    # Relationship back to the user
    user = relationship("User", back_populates="wallet")

# Assuming Base and engine have already been defined

class QueryLog(Base):
    __tablename__ = "query_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.now(timezone.utc))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chat_topic = Column(String, nullable=True)              # Optional chat topic
    query_input = Column(Text, nullable=False)              # Store the input query text
    query_output = Column(Text, nullable=False)             # Store the model output
    model_name = Column(String, nullable=False)             # Store the model name    
    provider_name = Column(String, nullable=False)          # Store the provider name 
    completion_tokens = Column(Integer,nullable=False)      # Completed token count i.e. Input + Output Token count
    total_tokens = Column(Integer,nullable=False)           # Total Token count = Input + Output + Prompt Token count
    latency = Column(Float,nullable=True)                  # Time taken for the model to return the response
    cost = Column(Float, nullable=False)                    # Actual cost of the total tokens
    cost_preference = Column(Integer,nullable=False)        # User's input cost preference
    latency_preference = Column(Integer,nullable=False)     # User's latency preference
    performance_preference = Column(Integer,nullable=False) # User's performance preference

    user = relationship("User", back_populates="query_logs")


class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, autoincrement=True)
    subject = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    template = Column(String, nullable=False)
    recipients = Column(String, nullable=False)  # Comma-separated emails
    sent_at = Column(DateTime(timezone=True), default=datetime.now(timezone.utc))
    sent_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    sender = relationship("User")