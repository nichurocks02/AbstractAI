import cohere
import os
from fastapi import HTTPException
from dotenv import load_dotenv
load_dotenv("../../../.env") 
# Load the COHERE_API_KEY from environment variables
api_key = os.getenv("CO_API_KEY")


co = cohere.AsyncClientV2(api_key=api_key)

async def handle_cohere_query_async(user_query: str, model_name: str, **kwargs):
    """
    Handle Cohere queries asynchronously with user-provided parameters.
    """
    try:
        # Call the Cohere chat API (similar to OpenAI's chat completion)
        response = await co.chat(
            model=model_name,
            messages=[cohere.UserChatMessageV2(content=user_query)],
            temperature=kwargs.get("temperature", 0.5)
        )
        print("Cohere")
        print(response)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cohere Query Error: {str(e)}")
