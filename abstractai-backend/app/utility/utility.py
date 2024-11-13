# app/utility/utility.py

import secrets

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
