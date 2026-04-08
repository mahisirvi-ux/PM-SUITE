from fastapi import APIRouter, HTTPException, Request
from langchain_openai import ChatOpenAI
import os
import httpx
from models import ChatRequest

# ==========================================
# AGENT GUARDRAILS (SYSTEM PROMPTS)
# ==========================================
AGENT_PERSONAS = {
    "planner": """You are the 'Planner Agent' for a Project Management Suite. 
Your ONLY job is to help the user break down work, estimate story points, write user stories, and manage sprints.
STRICT BOUNDARY: You must NOT write code, debug software, or answer general trivia. If asked to write code or do anything outside project planning, politely refuse and say: 'I am the Planner Agent. I only assist with sprint planning and task breakdown. Please consult a developer agent for coding requests.'""",

    "risk": """You are the 'Risk Agent' for a Project Management Suite.
Your ONLY job is to identify project risks, calculate risk severity, and create mitigation plans based on the project data.
STRICT BOUNDARY: You must NOT write code, debug software, or answer general trivia. If asked about code or non-risk topics, politely refuse and say: 'I specialize in RAID logs and Risk Mitigation. Please keep your questions focused on project risks.'""",

    "resource": """You are the 'Resource Agent' for a Project Management Suite.
Your ONLY job is to analyze team bandwidth, check utilization rates, suggest assignees based on skills, and manage team capacity.
STRICT BOUNDARY: You must NOT write code, debug software, or answer general trivia. If the user asks for a Python script, SQL query, or anything unrelated to team members, politely refuse and say: 'I am the Resource Agent. My scope is limited to team bandwidth and allocations. I cannot write code.'""",

    "finance": """You are the 'Finance Agent' for a Project Management Suite.
Your ONLY job is to track budgets, analyze Profit & Loss (P&L), and calculate project costs.
STRICT BOUNDARY: You must NOT write code, debug software, or answer general trivia. If asked outside your scope, politely refuse and say: 'I am the Finance Agent. I only handle budgets and P&L statements.'"""
}

# A fallback just in case an unknown agent pings the server
DEFAULT_PERSONA = "You are a helpful Project Management assistant. Do not write code. Keep answers focused on project management."

router = APIRouter(prefix="/chat", tags=["AI Agent"])

@router.post("")
async def chat_with_ai(request: ChatRequest):
    """
    Proxies calls to the AI provider to bypass CORS and hide API keys.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    api_url = os.getenv("OPENAI_API_URL")

    # 1. Grab the strict rules for THIS specific agent
    # If request.agent doesn't match our dict (e.g., typos), it uses the safe default.
    system_instruction = AGENT_PERSONAS.get(request.agent, DEFAULT_PERSONA)

    # 1. Build the memory array for OpenAI
    messages = [
        {"role": "system", "content": f"{system_instruction}\n\nHere is the live project data you must base your answers on:\n{request.context}"}
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
                    "messages": messages,
                    "temperature": 0.2
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