from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from datetime import datetime

DATABASE_URL = "sqlite:///auth.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})  # Necessary for SQLite
Base = declarative_base()

# User model for storing user information
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # One-to-one relationship with Wallet
    wallet = relationship("Wallet", uselist=False, back_populates="user")
    api_keys = relationship("APIKey", back_populates="user")

# APIKey model with proper relationship
class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    api_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="api_keys")

    __table_args__ = (
        UniqueConstraint('user_id', 'api_name', name='_user_api_name_uc'),
    )

# Wallet model for storing user balances
class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, unique=True)
    balance = Column(Integer, default=500)  # Default balance in cents ($5)

    # Relationship back to the user
    user = relationship("User", back_populates="wallet")


# Create database tables
Base.metadata.create_all(engine)
