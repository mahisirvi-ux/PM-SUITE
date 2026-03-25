from fastapi import FastAPI, Depends, HTTPException
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import create_engine, Column, String, Integer, Text, ForeignKey, BigInteger
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.dialects.postgresql import ARRAY
from pydantic import BaseModel
from typing import List, Optional
import os
from langchain_openai import ChatOpenAI
import httpx  # For making outgoing AI requests
load_dotenv()
# --- DATABASE SETUP ---
DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- SQLALCHEMY MODELS ---
class DBProject(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    desc = Column(Text)
    start = Column(String)
    end = Column(String)
    sprint = Column(Integer)
    sprints = Column(Integer)
    status = Column(String)
    updatedAt = Column(BigInteger)

class DBTask(Base):
    __tablename__ = "tasks"
    id = Column(String, primary_key=True, index=True)
    pid = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    ticket = Column(String)
    comp = Column(String)
    assignee = Column(String)
    sprint = Column(Integer)
    sp = Column(Integer)
    prio = Column(String)
    status = Column(String)
    prog = Column(Integer)
    start = Column(String)
    end = Column(String)
    notes = Column(Text)
    updatedAt = Column(BigInteger)

class DBRisk(Base):
    __tablename__ = "risks"
    id = Column(String, primary_key=True, index=True)
    pid = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    desc = Column(Text)
    sev = Column(String)
    cat = Column(String)
    prob = Column(String)
    imp = Column(String)
    owner = Column(String)
    status = Column(String)
    mit = Column(Text)
    updatedAt = Column(BigInteger)

class DBResource(Base):
    __tablename__ = "resources"
    id = Column(String, primary_key=True, index=True)
    pid = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    role = Column(String)
    util = Column(Integer)
    cap = Column(Integer)
    skills = Column(ARRAY(String))
    color = Column(String)
    updatedAt = Column(BigInteger)

class DBMilestone(Base):
    __tablename__ = "milestones"
    id = Column(String, primary_key=True, index=True)
    pid = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    date = Column(String)
    status = Column(String)
    tasks = Column(ARRAY(String))
    updatedAt = Column(BigInteger)

Base.metadata.create_all(bind=engine)

# --- PYDANTIC SCHEMAS ---
class ProjectSchema(BaseModel):
    id: str; name: str; desc: Optional[str] = None; start: Optional[str] = None; end: Optional[str] = None
    sprint: int; sprints: int; status: Optional[str] = None; updatedAt: int

class TaskSchema(BaseModel):
    id: str; pid: str; name: str; ticket: Optional[str] = None; comp: Optional[str] = None
    assignee: Optional[str] = None; sprint: int; sp: int; prio: str; status: str
    prog: int; start: Optional[str] = None; end: Optional[str] = None; notes: Optional[str] = None; updatedAt: int

class ChatRequest(BaseModel):
    agent: str
    message: str
    context: str
    history: list = []

# --- FASTAPI APP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")

# --- DEPENDENCY ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- API ROUTES ---

# AI CHAT PROXY
@app.post("/chat")
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

    # 2. Mock fallback (So your app doesn't crash if you haven't added an API key yet)
    if api_key == "YOUR_ACTUAL_KEY_HERE":
        return {"reply": f"🤖 **Mock Response from {request.agent.capitalize()} Agent**:\n\nI received your message: `{request.message}`.\n\n*Note: Replace 'YOUR_ACTUAL_KEY_HERE' in main.py to get real AI responses!*"}

    # 3. Call OpenAI
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                api_url,
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": "gpt-4o-mini",
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

# Projects
@app.get("/projects", response_model=List[ProjectSchema])
def read_projects(db: Session = Depends(get_db)):
    return db.query(DBProject).all()

@app.post("/projects")
def save_project(proj: ProjectSchema, db: Session = Depends(get_db)):
    db_proj = db.query(DBProject).filter(DBProject.id == proj.id).first()
    if db_proj:
        for key, value in proj.dict().items():
            setattr(db_proj, key, value)
    else:
        db_proj = DBProject(**proj.dict())
        db.add(db_proj)
    db.commit()
    return {"status": "success"}

# Tasks
@app.get("/tasks/{pid}", response_model=List[TaskSchema])
def read_tasks(pid: str, db: Session = Depends(get_db)):
    return db.query(DBTask).filter(DBTask.pid == pid).all()

@app.post("/tasks")
def save_task(task: TaskSchema, db: Session = Depends(get_db)):
    db_task = db.query(DBTask).filter(DBTask.id == task.id).first()
    if db_task:
        for key, value in task.dict().items():
            setattr(db_task, key, value)
    else:
        db_task = DBTask(**task.dict())
        db.add(db_task)
    db.commit()
    return {"status": "success"}

@app.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    db.query(DBTask).filter(DBTask.id == task_id).delete()
    db.commit()
    return {"status": "deleted"}

# Risks
@app.get("/risks/{pid}", response_model=List[dict])
def read_risks(pid: str, db: Session = Depends(get_db)):
    risks = db.query(DBRisk).filter(DBRisk.pid == pid).all()
    # Filter out hidden SQLAlchemy properties so it converts to JSON cleanly
    return [{k: v for k, v in r.__dict__.items() if not k.startswith("_")} for r in risks]

@app.post("/risks")
def save_risk(risk: dict, db: Session = Depends(get_db)):
    db_risk = db.query(DBRisk).filter(DBRisk.id == risk['id']).first()
    if db_risk:
        for k, v in risk.items(): setattr(db_risk, k, v)
    else:
        db.add(DBRisk(**risk))
    db.commit()
    return {"status": "success"}

@app.delete("/risks/{id}")
def delete_risk(id: str, db: Session = Depends(get_db)):
    db.query(DBRisk).filter(DBRisk.id == id).delete()
    db.commit()
    return {"status": "deleted"}

# Resources
@app.get("/resources/{pid}", response_model=List[dict])
def read_resources(pid: str, db: Session = Depends(get_db)):
    resources = db.query(DBResource).filter(DBResource.pid == pid).all()
    return [{k: v for k, v in r.__dict__.items() if not k.startswith("_")} for r in resources]

@app.post("/resources")
def save_resource(res: dict, db: Session = Depends(get_db)):
    db_res = db.query(DBResource).filter(DBResource.id == res['id']).first()
    if db_res:
        for k, v in res.items(): setattr(db_res, k, v)
    else:
        db.add(DBResource(**res))
    db.commit()
    return {"status": "success"}

@app.delete("/resources/{id}")
def delete_resource(id: str, db: Session = Depends(get_db)):
    db.query(DBResource).filter(DBResource.id == id).delete()
    db.commit()
    return {"status": "deleted"}

# Milestones
@app.get("/milestones/{pid}", response_model=List[dict])
def read_milestones(pid: str, db: Session = Depends(get_db)):
    milestones = db.query(DBMilestone).filter(DBMilestone.pid == pid).all()
    return [{k: v for k, v in m.__dict__.items() if not k.startswith("_")} for m in milestones]

@app.post("/milestones")
def save_milestone(ms: dict, db: Session = Depends(get_db)):
    db_ms = db.query(DBMilestone).filter(DBMilestone.id == ms['id']).first()
    if db_ms:
        for k, v in ms.items(): setattr(db_ms, k, v)
    else:
        db.add(DBMilestone(**ms))
    db.commit()
    return {"status": "success"}

@app.delete("/milestones/{id}")
def delete_milestone(id: str, db: Session = Depends(get_db)):
    db.query(DBMilestone).filter(DBMilestone.id == id).delete()
    db.commit()
    return {"status": "deleted"} 
