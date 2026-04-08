from sqlalchemy import Column, String, Integer, Float, Text, ForeignKey, BigInteger
from sqlalchemy.dialects.postgresql import ARRAY
from pydantic import BaseModel
from typing import Optional, List
from database import Base, engine
    
# --- SQLALCHEMY MODELS ---
class DBUsers(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="member")
    id_active = Column(Integer, default=1)

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

class DBPL(Base):
    __tablename__ = "pl_entries"
    id = Column(String, primary_key=True, index=True)
    pid = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    type = Column(String)
    cat = Column(String)
    desc = Column(String, nullable=False)
    period = Column(String)
    status = Column(String)
    budget = Column(Float)
    actual = Column(Float)
    forecast = Column(Float)
    owner = Column(String)
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

class DBPLEntry(BaseModel):
    id: str
    pid: str
    type: str
    cat: str
    desc: str
    period: str
    status: str
    budget: float
    actual: float
    forecast: float
    owner: str
    notes: str
    updatedAt: int

class ChatRequest(BaseModel):
    agent: str
    message: str
    context: str
    history: list = []

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserResponse(BaseModel):
    id: str
    email:str 
    password: str
    name: str

class Token(BaseModel):
    access_token: str
    token_type: str
