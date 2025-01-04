# app/db/models.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime,Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from app.db.database import engine 
Base = declarative_base()

# User model for storing user information
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)  # PostgreSQL requires autoincrement
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    avatar = Column(String, nullable=True)  # New column for avatar
    # One-to-one relationship with Wallet
    wallet = relationship("Wallet", uselist=False, back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")
    query_logs = relationship("QueryLog", back_populates="user")
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

