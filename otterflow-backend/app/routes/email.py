from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.database import get_db
from app.db.models import User, Email
from app.routes.auth import get_current_user, no_cache_response
from app.utility.utility import send_email  # Import the utility function

router = APIRouter(
    prefix="/email",
    tags=["Email"]
)

@router.post("/request_balance",include_in_schema=False)
async def request_balance(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Endpoint for users to request more balance when their wallet is low.
    The function:
      1. Validates that a reason is provided.
      2. Creates a record in the Email table.
      3. Sends an email notification to the admin using the send_email utility.
    """
    body = await request.json()
    reason = body.get("reason", "")
    if not reason.strip():
        raise HTTPException(status_code=400, detail="Reason is required")
    
    # Define the admin email address (you might want to store this in configuration)
    admin_email = "admin@example.com"
    
    # Create an email record to log the request in the database
    email_record = Email(
        subject=f"Balance Request from User: {user.name}",
        body=reason,
        template="balance_request",
        recipients=admin_email,
        sent_at=datetime.utcnow(),
        sent_by=user.id
    )
    db.add(email_record)
    db.commit()

    # Use the utility function to send an email notification to the admin
    try:
        send_email(
            to_email=admin_email,
            subject=email_record.subject,
            body=(
                f"User {user.name} (ID: {user.id}) has requested additional balance.\n\n"
                f"Reason:\n{reason}"
            )
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email notification: {str(e)}")

    return no_cache_response({"message": "Balance request submitted to admin."})
