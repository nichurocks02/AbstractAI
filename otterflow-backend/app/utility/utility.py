# app/utility/utility.py

import secrets
import random

from passlib.context import CryptContext
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from passlib.context import CryptContext
import random
import string
import smtplib
from email.message import EmailMessage
from fastapi import APIRouter, Depends, Request, HTTPException, Response, status


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def generate_otp(length: int = 6) -> str:
    return ''.join(random.choices(string.digits, k=length))

DEFAULT_WALLET_BALANCE = 500  # $5.00 in cents

def generate_unique_api_key():
    return secrets.token_hex(32)

def cost_per_query(input_cost_per_million, output_cost_per_million, num_input_tokens, num_output_tokens):
    cost_for_input = (input_cost_per_million / 1_000_000) * num_input_tokens
    cost_for_output = (output_cost_per_million / 1_000_000) * num_output_tokens
    total_cost = cost_for_input + cost_for_output
    return total_cost

def map_user_input_to_normalized(user_input, df, column_name):
    """
    Map a user input value between 0 and 1 to the corresponding normalized value range.
    
    :param user_input: User input value between 0 and 1.
    :param df: DataFrame containing normalized values for the column.
    :param column_name: Column name to map the value to.
    :return: Mapped normalized value.
    """
    min_val = df[column_name].min()
    max_val = df[column_name].max()
    return min_val + user_input * (max_val - min_val)


import random

def generate_initials_avatar(name: str) -> str:
    initials = "".join([word[0].upper() for word in name.split()])
    colors = [
        "#FF5733", "#33FF57", "#3357FF", "#FF33A8", "#FFC133", "#A833FF", "#33FFF4"
    ]  # Add more colors if needed
    bg_color = random.choice(colors)

    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <rect width="100" height="100" fill="{bg_color}" />
        <text x="50%" y="50%" font-size="40" fill="#FFF" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif">{initials}</text>
    </svg>
    """
    return svg


