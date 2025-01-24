import os
import asyncio
from groq import Groq
from fastapi import HTTPException
from dotenv import load_dotenv
load_dotenv() 
# Initialize the Groq client
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

async def handle_groq_query_async(user_query: str, model_name: str, **kwargs):
    """
    Handle a query to Groq asynchronously with user-provided parameters.
    """
    try:
        # Extract additional parameters like temperature and top_p
        temperature = kwargs.get("temperature", 0.5)
        top_p = kwargs.get("top_p", 1.0)

        # Run the Groq completion in a separate thread to simulate async behavior
        response = await asyncio.to_thread(
            client.chat.completions.create,
            messages=[{"role": "user", "content": user_query}],
            model=model_name,
            temperature=temperature,
            top_p=top_p
        )
        
        print("groq")
        print(response)
        # Return the generated content from the response
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq Query Error: {str(e)}")
