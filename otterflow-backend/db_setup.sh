#!/bin/bash

# Function to check if 'postgres' user exists
postgres_user_exists() {
    if id "postgres" &>/dev/null; then
        # 'postgres' user exists
        return 0
    else
        # 'postgres' user does not exist
        return 1
    fi
}

# Function to execute psql command as postgres or current user
psql_exec() {
    local sql_command="$1"
    if postgres_user_exists; then
        sudo -u postgres psql -d postgres -c "$sql_command"
    else
        psql -d postgres -c "$sql_command"
    fi
}

# Function to check if database exists
check_db_exists() {
    local db_name="$1"
    if postgres_user_exists; then
        sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name';" | grep -q 1
    else
        psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$db_name';" | grep -q 1
    fi
}

# Function to check if user exists
check_user_exists() {
    local user_name="$1"
    if postgres_user_exists; then
        sudo -u postgres psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$user_name';" | grep -q 1
    else
        psql -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$user_name';" | grep -q 1
    fi
}

# Step 1: Install PostgreSQL if not installed
install_postgresql() {
    if ! command -v psql &> /dev/null; then
        echo "PostgreSQL is not installed. Installing..."
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt update
            sudo apt install -y postgresql postgresql-contrib
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            brew install postgresql
        else
            echo "Unsupported OS"
            exit 1
        fi
    else
        echo "PostgreSQL is already installed."
    fi
}

# Step 2: Start PostgreSQL service
start_postgresql() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo service postgresql start
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql
    fi
    echo "PostgreSQL service started."
}

# Step 3: Create a PostgreSQL database and user
create_postgres_db_and_user() {
    DB_NAME="abstractai"
    DB_USER="abstract_user_admin"
    DB_PASS="hello1234"

    # Create user if not exists
    if check_user_exists "$DB_USER"; then
        echo "User $DB_USER already exists."
    else
        echo "Creating user $DB_USER..."
        psql_exec "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
        psql_exec "ALTER ROLE $DB_USER SET client_encoding TO 'utf8';"
        psql_exec "ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';"
        psql_exec "ALTER ROLE $DB_USER SET timezone TO 'UTC';"
        echo "User $DB_USER created successfully."
    fi

    # Create database if not exists
    if check_db_exists "$DB_NAME"; then
        echo "Database $DB_NAME already exists."
    else
        echo "Creating database $DB_NAME..."
        psql_exec "CREATE DATABASE $DB_NAME;"
        psql_exec "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
        echo "Database $DB_NAME created successfully."
    fi
}

# Step 4: Create .env file in the root directory for environment variables
create_env_file() {
    ENV_FILE=".env"  # This ensures .env is created in the root directory of the project (one level above setup/)

    if [ -f "$ENV_FILE" ]; then
        echo ".env file already exists at $ENV_FILE. Overwriting environment variables."
    else
        echo "Creating new .env file at $ENV_FILE."
    fi

    # Overwrite PostgreSQL environment variables to the .env file
    cat <<EOT > "$ENV_FILE"
POSTGRES_DB="abstractai"
POSTGRES_USER="abstract_user_admin"
POSTGRES_PASSWORD="hello1234"
POSTGRES_HOST="localhost"
POSTGRES_PORT=5432
DATABASE_URL="postgresql://abstract_user_admin:hello1234@localhost:5432/abstractai"
EOT

    echo ".env file created or updated at $ENV_FILE."
}



# Main setup function
main() {
    install_postgresql
    start_postgresql
    create_postgres_db_and_user
    create_env_file
    
}

main
