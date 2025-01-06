# Internal Code Documentation: Authentication Database Schema

[Linked Table of Contents](#linked-table-of-contents)

## <a name="linked-table-of-contents"></a>Linked Table of Contents

* [1. Introduction](#1-introduction)
* [2. Database Setup](#2-database-setup)
* [3. Data Models](#3-data-models)
    * [3.1 User Model](#31-user-model)
    * [3.2 API Key Model](#32-api-key-model)
    * [3.3 Wallet Model](#33-wallet-model)
* [4. Relationships between Models](#4-relationships-between-models)


## 1. Introduction

This document details the database schema used for authentication within the application.  The schema is implemented using SQLAlchemy, an Object Relational Mapper (ORM) for Python.  It utilizes a SQLite database for storage.


## 2. Database Setup

The database is configured using SQLAlchemy's `create_engine` function, connecting to a SQLite database file named `auth.db`. The `connect_args={"check_same_thread": False}` argument is necessary for enabling multi-threaded access to the SQLite database.  The `declarative_base()` function provides a base class for defining database tables as Python classes. The database tables are created using `Base.metadata.create_all(engine)`.

```python
DATABASE_URL = "sqlite:///auth.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
Base = declarative_base()
Base.metadata.create_all(engine)
```

## 3. Data Models

The database schema consists of three core tables: `users`, `api_keys`, and `wallets`. Each table is represented by a SQLAlchemy declarative class.

### 3.1 User Model

The `User` model stores information about application users.

| Column Name  | Data Type | Constraints                               | Description                                      |
|--------------|------------|-------------------------------------------|--------------------------------------------------|
| `id`         | Integer    | Primary Key                               | Unique identifier for each user.                 |
| `email`      | String     | Unique, Not Null                         | User's email address (must be unique).           |
| `name`       | String     | Not Null                                 | User's name.                                     |
| `is_active`  | Boolean    | Default: True                           | Indicates whether the user account is active.     |
| `wallet`     | Wallet     | One-to-one relationship with Wallet model | Accesses the associated user's Wallet information |
| `api_keys`   | APIKey     | One-to-many relationship with APIKey model| Accesses the API keys associated with the user. |


### 3.2 API Key Model

The `APIKey` model manages API keys associated with users.  A unique constraint ensures that a user can only have one API key per API name.

| Column Name    | Data Type | Constraints                                      | Description                                          |
|-----------------|------------|---------------------------------------------------|------------------------------------------------------|
| `id`            | Integer    | Primary Key                                       | Unique identifier for each API key.                   |
| `key`           | String     | Unique, Not Null                                 | The API key itself (must be unique).                 |
| `user_id`       | Integer    | Foreign Key referencing `users.id`, Not Null     | The ID of the user this API key belongs to.          |
| `api_name`      | String     | Not Null                                         | The name of the API this key is for.                 |
| `is_active`     | Boolean    | Default: True                                    | Indicates whether the API key is active.             |
| `created_at`   | DateTime   | Default: `datetime.utcnow()`                     | Timestamp indicating when the API key was created.     |


The `__table_args__` section defines a unique constraint across `user_id` and `api_name` to prevent duplicate API keys for the same user and API.


### 3.3 Wallet Model

The `Wallet` model tracks user balances.

| Column Name | Data Type | Constraints                               | Description                                     |
|-------------|------------|-------------------------------------------|-------------------------------------------------|
| `id`        | Integer    | Primary Key                               | Unique identifier for each wallet.              |
| `user_id`   | Integer    | Foreign Key referencing `users.id`, Unique, Not Null | The ID of the user this wallet belongs to.     |
| `balance`   | Integer    | Default: 500 (cents)                      | User's balance, stored in cents. ($5 default) |


## 4. Relationships between Models

The models are interconnected through SQLAlchemy relationships:

* **User to Wallet:** A one-to-one relationship (`uselist=False`). Each user has exactly one wallet.
* **User to API Key:** A one-to-many relationship.  A user can have multiple API keys.
* **API Key to User:** A many-to-one relationship (reverse of the above).


The `back_populates` argument in the relationship definitions ensures that the relationships are bidirectional, allowing access from either side.  For example, you can access a user's wallet via `user.wallet` and access the user associated with an API key via `api_key.user`.
