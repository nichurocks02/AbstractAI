# app/schemas/email_schemas.py

from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class EmailCreate(BaseModel):
    subject: Optional[str] = None  # Required if template is 'custom'
    body: Optional[str] = None     # Required if template is 'custom'
    template: str                  # 'custom', 'welcome', 'increase_limit', 'payment_due'
    recipients: List[EmailStr]

class EmailInDB(BaseModel):
    id: int
    subject: str
    body: str
    template: str
    recipients: List[EmailStr]
    sent_at: datetime
    sent_by: int

    model_config = {"from_attributes": True}

class EmailResponse(BaseModel):
    id: int
    subject: str
    template: str
    recipients: List[EmailStr]
    sent_at: datetime

    model_config = {"from_attributes": True}
