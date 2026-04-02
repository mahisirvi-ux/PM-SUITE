from fastapi import APIRouter, HTTPException
from langchain_openai import ChatOpenAI
import os
import httpx
from models import ChatRequest

router = APIRouter(prefix="/chat", tags=["AI Agent"])

@router.post("/")
async def chat_with_ai(request: ChatRequest):
    """
    Proxies calls to the AI provider to bypass CORS and hide API keys.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    api_url = os.getenv("OPENAI_API_URL")

    # 1. Build the memory array for OpenAI
    messages = [
        {"role": "system", "content": f"You are the {request.agent.capitalize()} agent in BUSINESSNEXT PM Suite. Answer using this live data:\n{request.context}"}
    ]
    # Add previous chat history
    for msg in request.history:
        messages.append(msg)
    # Add the newest user message
    messages.append({"role": "user", "content": request.message})

    # 2. Mock fallback
    if api_key == "YOUR_ACTUAL_KEY_HERE" or not api_key:
        return {"reply": f"🤖 **Mock Response from {request.agent.capitalize()} Agent**:\n\nI received your message: `{request.message}`.\n\n*Note: Replace API Key in .env to get real AI responses!*"}

    # 3. Call OpenAI
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o-mini", # Update model name if needed
                    "messages": messages
                },
                timeout=45.0
            )
            data = response.json()
            
            # 4. Safely extract the text response
            if "choices" in data:
                return {"reply": data["choices"][0]["message"]["content"]}
            else:
                return {"reply": f"API Error: {data}"}
                
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))