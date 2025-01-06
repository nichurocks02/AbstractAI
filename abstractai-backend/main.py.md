# Internal Code Documentation

## Table of Contents

* [1. Introduction](#1-introduction)
* [2. Database Setup](#2-database-setup)
* [3. Authentication and Authorization](#3-authentication-and-authorization)
    * [3.1 Google OAuth2 Login](#31-google-oauth2-login)
    * [3.2 Token Verification](#32-token-verification)
* [4. API Key Management](#4-api-key-management)
    * [4.1 API Key Generation](#41-api-key-generation)
    * [4.2 API Key Status Update](#42-api-key-status-update)
    * [4.3 API Key Revocation](#43-api-key-revocation)
    * [4.4 API Key Deletion](#44-api-key-deletion)
    * [4.5 API Key Listing](#45-api-key-listing)
* [5. Wallet Management](#5-wallet-management)
    * [5.1 Wallet Recharge](#51-wallet-recharge)
    * [5.2 Wallet Balance Retrieval](#52-wallet-balance-retrieval)
* [6. User Query Handling](#6-user-query-handling)
* [7. Utility Functions](#7-utility-functions)
* [8. Application Startup](#8-application-startup)


<br>

### 1. Introduction

This document provides internal code documentation for the FastAPI application.  The application handles user authentication via Google OAuth2, manages API keys tied to user wallets, processes user queries using a machine learning model, and integrates with Stripe for payment processing.  The application uses SQLite for persistence; this is for development and testing purposes and is not suitable for production.

<br>

### 2. Database Setup

The application uses SQLAlchemy to interact with a SQLite database (`auth.db`). The `Base` class defines the database models (`User`, `APIKey`, `Wallet`).  The database tables are created automatically upon application startup.  The database URL is configured using an environment variable for flexibility.  The `connect_args={"check_same_thread": False}` parameter is crucial for SQLite to allow access from multiple threads within the application. A `SessionLocal` object is created to manage database sessions, ensuring proper resource management through a context manager in the `get_db` dependency.

| Table Name | Columns                                      | Description                                                                     |
|-------------|----------------------------------------------|---------------------------------------------------------------------------------|
| User        | `id` (INT, primary key), `email` (TEXT), `name` (TEXT) | Stores user information.                                                       |
| APIKey      | `id` (INT, primary key), `key` (TEXT), `user_id` (INT), `api_name` (TEXT), `is_active` (BOOLEAN), `created_at` (DATETIME) | Stores API keys associated with users.                                           |
| Wallet      | `id` (INT, primary key), `user_id` (INT), `balance` (INT) | Stores the wallet balance for each user (balance stored in cents).               |


<br>

### 3. Authentication and Authorization

#### 3.1 Google OAuth2 Login

The `/login/google` endpoint redirects the user to Google's OAuth2 authentication flow.  After successful authentication, Google redirects the user to the `/auth/google` endpoint with an authorization code.  The `/auth/google` endpoint exchanges the code for an access token, retrieves user information from Google's API, and creates a new user in the database if one doesn't exist.  A new wallet is created for new users with a default balance (`DEFAULT_WALLET_BALANCE`). The user's ID is stored in an in-memory session store (`session_store`) using the client's host as the key.  This is not suitable for production and a more robust session management system should be used.

#### 3.2 Token Verification

The `/token` endpoint verifies JWT tokens using the `GOOGLE_CLIENT_SECRET` as the signing key. This endpoint is used internally for authentication and authorization.


<br>

### 4. API Key Management

#### 4.1 API Key Generation

The `/generate-api` endpoint generates a unique API key for a logged-in user. It deducts a cost of 100 cents ($1.00) from the user's wallet.  The `generate_unique_api_key` function ensures that the generated key is unique.  A check is performed to ensure the API name is unique for the user.

#### 4.2 API Key Status Update

The `/api-key/{api_name}/status` endpoint allows updating the status (active/inactive) of an API key. Activating an API key requires sufficient balance in the user's wallet.

#### 4.3 API Key Revocation

The `/api-key/{api_name}` endpoint revokes an API key by setting its `is_active` field to `False`.

#### 4.4 API Key Deletion

The `/api-key/{api_name}/delete` endpoint permanently deletes an API key from the database.

#### 4.5 API Key Listing

The `/api-keys` endpoint returns a list of all API keys associated with the logged-in user, along with the current wallet balance.  The response uses the `APIKeyOut` Pydantic model for structured output.

<br>

### 5. Wallet Management

#### 5.1 Wallet Recharge

The `/wallet/recharge` endpoint allows users to recharge their wallets using Stripe.  The endpoint receives a Stripe payment token and charges the user's card. Upon successful payment, the wallet balance is updated.

#### 5.2 Wallet Balance Retrieval

The `/wallet/balance` endpoint returns the current balance of the logged-in user's wallet.


<br>

### 6. User Query Handling

The `/query/` endpoint handles user queries. It first authenticates the user and checks their wallet balance.  The query is processed using a machine learning model, and the cost is calculated based on the input and output token counts and predefined costs from the `predict_model` function and the `cost_per_query` function. The cost is deducted from the wallet, and the model's response is returned to the user.

The `predict_model` function uses a pre-loaded CSV file (`models_2024_aug.csv`) for information on models. The algorithm behind `predict_model`  (not shown in the provided code) should be documented separately. The `cost_per_query` function calculates the cost according to a certain algorithm (not shown).  The `send_query_to_model` function (not shown) sends the query to the appropriate model.


<br>

### 7. Utility Functions

* **`generate_unique_api_key()`**: This function (not shown) generates a cryptographically secure, unique API key.
* **`cost_per_query(input_cost_per_million, output_cost_per_million, num_input_tokens, num_output_tokens)`**: This function calculates the cost of a query based on input and output token counts and the cost per million tokens for input and output.  The specific calculation algorithm needs to be documented separately.


<br>

### 8. Application Startup

The application loads environment variables using `load_dotenv()`, initializes the Stripe API key, creates database tables, and starts the Uvicorn server. The preprocessed data for the machine learning model is loaded during startup.  This loading could be optimized to be lazy (loaded on first request) for better performance.
