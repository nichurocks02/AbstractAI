import os
import asyncio
import google.generativeai as genai
from fastapi import HTTPException
from dotenv import load_dotenv
load_dotenv("otterflow-backend/.env") 

# Configure the API key
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

async def handle_google_query_async(user_query: str, model_name: str, **kwargs):
    """
    Handle Google Gemini queries asynchronously with user-provided parameters.
    """
    try:
        # Select the model (assuming the model name matches what you provided)
        model = genai.GenerativeModel(model_name)

        # Extract additional parameters like temperature, top_p, etc.
        temperature = kwargs.get("temperature", 0.5)
        top_p = kwargs.get("top_p", 1.0)

        # Run the model generation in a separate thread (to avoid blocking the event loop)
        response = await asyncio.to_thread(
            model.generate_content,
            user_query,
            generation_config=genai.types.GenerationConfig(
                temperature=temperature,
                top_p=top_p
            )
        )

        # Return the generated content
        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google Query Error: {str(e)}")
    

'''
# Main function to call the handle_google_query_async function
async def main():
    user_query = "Hi"  # Example query
    model_name = "gemini-1.5-flash"  # Example model name
    result = await handle_google_query_async(user_query, model_name, temperature=0.7, top_p=0.9)
    print(result)


# Run the main function
if __name__ == "__main__":
    asyncio.run(main())
'''