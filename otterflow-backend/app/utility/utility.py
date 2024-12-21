# app/utility/utility.py

import secrets
import random

from passlib.context import CryptContext
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Function to generate OTP
def generate_otp() -> str:
    return str(random.randint(100000, 999999))  # Generate a 6-digit OTP

# Function to send OTP via email using environment variables
def send_otp_email(email: str, otp: str):
    sender_email = os.getenv("EMAIL_ADDRESS")  # Retrieve from environment variable
    sender_password = os.getenv("EMAIL_PASSWORD")  # Retrieve from environment variable
    receiver_email = email
    print(sender_email, sender_password)
    # Set up the MIME (Multipurpose Internet Mail Extensions)
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = receiver_email
    message["Subject"] = "Your OTP for Account Verification"
    
    body = f"Your OTP is: {otp}"
    message.attach(MIMEText(body, "plain"))

    try:
        # Connect to the mail server and send the email
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, receiver_email, message.as_string())
            print("OTP sent successfully!")
    except Exception as e:
        print(f"Error sending email: {str(e)}")

# Initialize password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Function to hash a password
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Function to verify a password
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

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
