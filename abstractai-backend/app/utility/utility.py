import secrets

def generate_unique_api_key():
    return secrets.token_hex(32)


def cost_per_query(input_cost_per_million,output_cost_per_million, num_input_tokens, num_output_tokens):
    cost_for_input = (input_cost_per_million / 1_000_000) * num_input_tokens
    cost_for_output = (output_cost_per_million / 1_000_000) * num_output_tokens
    total_cost = cost_for_input + cost_for_output
    return total_cost