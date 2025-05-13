import os
import smtplib
from email.message import EmailMessage
from fastapi import APIRouter, HTTPException, Request

router = APIRouter(prefix="/frontendemail", tags=["FrontEndEmail"])

# Email configuration from environment variables
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

@router.post("/request_demo",include_in_schema=False)
async def request_demo(request: Request):
    """
    Endpoint for users to request a demo.
    Expected JSON payload:
      {
          "name": "User Name",
          "email": "user@example.com",
          "message": "I'm interested in a demo."
      }
    """
    data = await request.json()
    name = data.get("name")
    email = data.get("email")
    message = data.get("message")
    
    if not name or not email or not message:
        raise HTTPException(status_code=400, detail="Name, email, and message are required.")
    
    # For now, send the demo request email to a predefined address.
    admin_email = "ceo@otterflow.in"
    subject = f"Demo Request from {name}"
    body = f"Name: {name}\nEmail: {email}\nMessage:\n{message}"
    
    # Send the email using the provided utility function.
    send_email(admin_email, subject, body)
    
    # Return a JSON response with a success property.
    return {"success": True, "message": "Demo request sent successfully."}

