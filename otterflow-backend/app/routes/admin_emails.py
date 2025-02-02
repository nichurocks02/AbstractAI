# app/routes/admin_emails.py

from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Email, User
from app.schemas.email_schemas import EmailCreate, EmailInDB, EmailResponse
from app.routes.admin_auth import get_current_admin, get_admin_user
from fastapi.responses import JSONResponse
import os
import smtplib
from email.message import EmailMessage
from pydantic import EmailStr

router = APIRouter(
    prefix="/admin/emails",
    tags=["AdminEmails"]
)

def no_cache_response(content: dict, status_code: int = 200) -> JSONResponse:
    response = JSONResponse(content=content, status_code=status_code)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["Surrogate-Control"] = "no-store"
    return response

# Email configuration
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD")
EMAIL_FROM = os.getenv("EMAIL_FROM", EMAIL_HOST_USER)

def send_email(to_email: str, subject: str, body: str):
    if not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
        raise HTTPException(status_code=500, detail="Email server credentials not configured.")
    
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = EMAIL_FROM
    msg['To'] = to_email
    msg.set_content(body)
    
    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.starttls()
            server.login(EMAIL_HOST_USER, EMAIL_HOST_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# Predefined email templates
TEMPLATES = {
    "welcome": {
        "subject": "Welcome to Our Platform!",
        "body": "Hello,\n\nThank you for joining our platform. We're excited to have you!\n\nBest regards,\nTeam"
    },
    "increase_limit": {
        "subject": "Increase Your Usage Limit",
        "body": "Hello,\n\nWe've increased your usage limit. Enjoy more features and flexibility!\n\nBest regards,\nTeam"
    },
    "payment_due": {
        "subject": "Payment Due Reminder",
        "body": "Hello,\n\nThis is a reminder that your payment is due on [DATE]. Please ensure timely payment to continue using our services.\n\nBest regards,\nTeam"
    },
    "custom": {
        "subject": None,  # Will use provided subject
        "body": None      # Will use provided body
    }
}

@router.get("/users", response_model=List[EmailStr])
def get_user_emails(
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    """
    Return a list of active user emails.
    """
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    users = db.query(User).filter(User.is_active == True).all()
    emails = [user.email for user in users]
    return emails

@router.post("/send", response_model=EmailInDB, status_code=status.HTTP_201_CREATED)
def send_email_notification(
    email_data: EmailCreate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_admin_user)  # Retrieve admin user object
):
    """
    Send an email to selected recipients using a template or custom content
    and store the email record in the database.
    """
    template_name = email_data.template.lower()
    if template_name not in TEMPLATES:
        raise HTTPException(status_code=400, detail="Invalid email template selected.")
    
    template = TEMPLATES[template_name]
    
    if template_name == "custom":
        if not email_data.subject or not email_data.body:
            raise HTTPException(status_code=400, detail="Subject and body are required for custom emails.")
        subject = email_data.subject
        body = email_data.body
    else:
        subject = template["subject"]
        body = template["body"]
    
    # Convert list of recipients to comma-separated string
    recipients_str = ", ".join(email_data.recipients)
    
    # Send emails
    for recipient in email_data.recipients:
        send_email(recipient, subject, body)
    
    # Store email record in the database
    new_email = Email(
        subject=subject,
        body=body,
        template=template_name,
        recipients=recipients_str,
        sent_by=admin_user.id
    )
    db.add(new_email)
    db.commit()
    db.refresh(new_email)
    
    # Convert recipients back to list for the response
    new_email.recipients = email_data.recipients
    
    return new_email

@router.get("/list", response_model=List[EmailResponse])
def get_recent_emails(
    db: Session = Depends(get_db),
    is_admin: bool = Depends(get_current_admin)
):
    """
    Retrieve recent emails sent.
    """
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    
    emails = db.query(Email).order_by(Email.sent_at.desc()).limit(100).all()
    email_responses = []
    for email in emails:
        recipients_list = [addr.strip() for addr in email.recipients.split(",")]
        template_title = email.template.capitalize().replace("_", " ")
        email_responses.append(EmailResponse(
            id=email.id,
            subject=email.subject,
            template=template_title,
            recipients=recipients_list,
            sent_at=email.sent_at.isoformat()
        ))
    return email_responses
