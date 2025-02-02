import httpx
import json
import os
from dotenv import load_dotenv
from fastapi import HTTPException

# Load environment variables
load_dotenv("otterflow-backend/.env")

# Bearer token for authorization
authorization_bearer_token = "Bearer " + str(os.getenv("AI_API_KEY"))
print(authorization_bearer_token)
async def handle_aiml_query_async(user_query: str, model_name: str, **kwargs):
    """
    Handle AIML API query asynchronously with user-provided parameters.
    """
    url = "https://api.aimlapi.com/chat/completions"
    headers = {
        "Authorization": authorization_bearer_token,
        "Content-Type": "application/json",
    }
    payload = {
        "model": model_name,
        "messages": [
            {
                "role": "user",
                "content": user_query,
            },
        ],
        "max_tokens": 512,
        "stream": False,
    }

    # Using httpx to make async requests
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()  # Raise for HTTP errors

            # Return the JSON response from the API
            print("aiml")
            print(response.json())
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=response.status_code, detail=f"HTTP error occurred: {e}")
        except httpx.RequestError as e:
            raise HTTPException(status_code=500, detail=f"Request error occurred: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error occurred: {str(e)}")
'''
# Example function call (to be run in an async context)
async def main():
    user_query = "What kind of model are you?"
    response = await handle_aiml_query_async(user_query, model_name="gpt-4o")
    print("aiml")
    print(response)
    print(json.dumps(response, indent=4))

# Running the example async function
if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
'''