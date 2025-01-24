from openai import AsyncOpenAI
import asyncio
from fastapi import HTTPException
import os
from dotenv import load_dotenv
load_dotenv() 
# Initialize the AsyncOpenAI client
client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"),)

async def handle_openai_query_async(user_query: str, model_name: str, **kwargs):
    """
    Handle OpenAI queries asynchronously with user-provided parameters.
    """
    try:
        response = await client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": user_query}],
            stream=False,
            temperature=kwargs.get("temperature", 0.5),
            top_p=kwargs.get("top_p", 1.0),
        )
        print(response)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpenAI Query Error: {str(e)}")

