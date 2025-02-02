import asyncio
import os
import json
import collections.abc
from fastapi import HTTPException
from app.llm.openai_query import handle_openai_query_async
from app.llm.groq_query import handle_groq_query_async
from app.llm.google_query import handle_google_query_async
from app.llm.aimlapi_query import handle_aiml_query_async
from app.llm.cohere_query import handle_cohere_query_async
from google.protobuf.message import Message as ProtobufMessage

# Function to serialize non-serializable response objects
def serialize_response(response):
    """
    Serialize non-serializable response objects (like custom classes, protobuf messages) to dictionaries.
    Handles `mappingproxy`, protobuf messages, and other non-serializable objects.
    """
    if isinstance(response, collections.abc.Mapping):  # This handles dictionary-like objects
        return {k: serialize_response(v) for k, v in response.items()}
    elif isinstance(response, list):  # If the response is a list, recursively serialize each item
        return [serialize_response(item) for item in response]
    elif isinstance(response, ProtobufMessage):  # If the response is a protobuf message
        return serialize_response(vars(response))  # Convert to dictionary
    elif hasattr(response, '__dict__'):  # Handle custom objects with __dict__ attribute (like ChatCompletion)
        return serialize_response(vars(response))  # Convert to dictionary
    else:
        return response  # Return the data if it's a primitive type

# Function to run a specific query
async def run_query(api_name: str, user_query: str, model_name: str, **kwargs):
    try:
        if api_name == "OpenAI":
            result = await handle_openai_query_async(user_query, model_name, **kwargs)
            print(result.choices[0].message.content)
            print(type(result))
        elif api_name == "AIML":
            result = await handle_aiml_query_async(user_query, model_name, **kwargs)
        elif api_name == "Cohere":
            result = await handle_cohere_query_async(user_query, model_name, **kwargs)
        elif api_name == "Google":
            result = await handle_google_query_async(user_query, model_name, **kwargs)
        elif api_name == "Groq":
            result = await handle_groq_query_async(user_query, model_name, **kwargs)
        else:
            raise HTTPException(status_code=400, detail=f"API name {api_name} is not recognized.")

        # Serialize the result before printing
        #serialized_result = serialize_response(result)
        print(f"Response from {api_name} ({model_name}):\n{json.dumps(result, indent=4)}\n")

    except HTTPException as e:
        print(f"Error while querying {api_name} ({model_name}): {e.detail}")
    except Exception as e:
        print(f"Unexpected error with {api_name} ({model_name}): {str(e)}")

# Function to run all queries concurrently
async def run_queries(user_query: str, **kwargs):
    # Run all queries concurrently and print each response as soon as it arrives
    tasks = [
        run_query("OpenAI", user_query, "gpt-4o-mini", **kwargs),
        #run_query("AIML", user_query, "mistralai/mistral-nemo", **kwargs),
        #run_query("Cohere", user_query, "command-r", **kwargs),
        #run_query("Google", user_query, "gemini-1.5-flash", **kwargs),
        #run_query("Groq", user_query, "llama3-8b-8192", **kwargs)
    ]

    await asyncio.gather(*tasks)

# Main function to start the program
if __name__ == "__main__":
    user_query = "Hi!"  # Example user query

    # Run the queries concurrently
    asyncio.run(run_queries(user_query))
