from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import json
import io
import time
import uuid

from database import get_db
from models import DBProject, DBTask, DBRisk, DBResource, DBMilestone, ProjectSchema, TaskSchema

router = APIRouter(tags=["Core PM"])

# --- PROJECTS ---
@router.get("/projects", response_model=List[ProjectSchema])
def read_projects(db: Session = Depends(get_db)):
    return db.query(DBProject).all()

@router.post("/projects")
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

# --- TASKS ---
@router.get("/tasks/{pid}", response_model=List[TaskSchema])
def read_tasks(pid: str, db: Session = Depends(get_db)):
    return db.query(DBTask).filter(DBTask.pid == pid).all()

@router.post("/tasks")
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

@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    db.query(DBTask).filter(DBTask.id == task_id).delete()
    db.commit()
    return {"status": "deleted"}

# --- RISKS ---
@router.get("/risks/{pid}", response_model=List[dict])
def read_risks(pid: str, db: Session = Depends(get_db)):
    risks = db.query(DBRisk).filter(DBRisk.pid == pid).all()
    return [{k: v for k, v in r.__dict__.items() if not k.startswith("_")} for r in risks]

@router.post("/risks")
def save_risk(risk: dict, db: Session = Depends(get_db)):
    db_risk = db.query(DBRisk).filter(DBRisk.id == risk['id']).first()
    if db_risk:
        for k, v in risk.items(): setattr(db_risk, k, v)
    else:
        db.add(DBRisk(**risk))
    db.commit()
    return {"status": "success"}

@router.delete("/risks/{id}")
def delete_risk(id: str, db: Session = Depends(get_db)):
    db.query(DBRisk).filter(DBRisk.id == id).delete()
    db.commit()
    return {"status": "deleted"}

# --- RESOURCES ---
@router.get("/resources/{pid}", response_model=List[dict])
def read_resources(pid: str, db: Session = Depends(get_db)):
    resources = db.query(DBResource).filter(DBResource.pid == pid).all()
    return [{k: v for k, v in r.__dict__.items() if not k.startswith("_")} for r in resources]

@router.post("/resources")
def save_resource(res: dict, db: Session = Depends(get_db)):
    db_res = db.query(DBResource).filter(DBResource.id == res['id']).first()
    if db_res:
        for k, v in res.items(): setattr(db_res, k, v)
    else:
        db.add(DBResource(**res))
    db.commit()
    return {"status": "success"}

@router.delete("/resources/{id}")
def delete_resource(id: str, db: Session = Depends(get_db)):
    db.query(DBResource).filter(DBResource.id == id).delete()
    db.commit()
    return {"status": "deleted"}

# --- MILESTONES ---
@router.get("/milestones/{pid}", response_model=List[dict])
def read_milestones(pid: str, db: Session = Depends(get_db)):
    milestones = db.query(DBMilestone).filter(DBMilestone.pid == pid).all()
    return [{k: v for k, v in m.__dict__.items() if not k.startswith("_")} for m in milestones]

@router.post("/milestones")
def save_milestone(ms: dict, db: Session = Depends(get_db)):
    db_ms = db.query(DBMilestone).filter(DBMilestone.id == ms['id']).first()
    if db_ms:
        for k, v in ms.items(): setattr(db_ms, k, v)
    else:
        db.add(DBMilestone(**ms))
    db.commit()
    return {"status": "success"}

@router.delete("/milestones/{id}")
def delete_milestone(id: str, db: Session = Depends(get_db)):
    db.query(DBMilestone).filter(DBMilestone.id == id).delete()
    db.commit()
    return {"status": "deleted"}

# --- IMPORT / EXPORT ---
@router.post("/import")
async def import_data(
    file: UploadFile = File(...), 
    import_type: str = Form("tasks"), 
    pid: Optional[str] = Form(None), 
    db: Session = Depends(get_db)
):
    try:
        content = await file.read()
        
        # 1. Handle CSV Import
        if file.filename.endswith('.csv'):
            decoded = content.decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded))
            headers = reader.fieldnames
            if not headers:
                raise HTTPException(status_code=400, detail="The CSV file is empty or unreadable.")

            count = 0
            if import_type == "projects":
                if 'name' not in headers:
                    raise HTTPException(status_code=400, detail="Invalid CSV format. Must contain 'name' column.")
                for row in reader:
                    proj_id = row.get('id', str(uuid.uuid4())[:8]).strip() or str(uuid.uuid4())[:8]
                    new_proj = DBProject(
                        id=proj_id, name=row.get('name'), desc=row.get('desc', ''),
                        start=row.get('start', ''), end=row.get('end', ''),
                        sprint=int(row.get('sprint', 1)) if str(row.get('sprint', '1')).isdigit() else 1,
                        sprints=int(row.get('sprints', 12)) if str(row.get('sprints', '12')).isdigit() else 12,
                        status=row.get('status', 'On Track'), updatedAt=int(time.time() * 1000)
                    )
                    existing = db.query(DBProject).filter(DBProject.id == proj_id).first()
                    if existing:
                        for key, value in new_proj.__dict__.items():
                            if not key.startswith('_'): setattr(existing, key, value)
                    else:
                        db.add(new_proj)
                    count += 1

            elif import_type == "tasks":
                if not pid:
                    raise HTTPException(status_code=400, detail="Select a project first.")
                if 'name' not in headers:
                    raise HTTPException(status_code=400, detail="Invalid CSV format. Must contain 'name' column.")
                for row in reader:
                    task_id = row.get('id', str(uuid.uuid4())[:8]).strip() or str(uuid.uuid4())[:8]
                    new_task = DBTask(
                        id=task_id, pid=pid, name=row.get('name'), ticket=row.get('ticket',''),
                        comp=row.get('comp', ''), status=row.get('status', 'To Do'),
                        prio=row.get('priority', 'Medium'), sp=int(row.get('sp', 0)) if str(row.get('sp', '0')).isdigit() else 0,
                        assignee=row.get('assignee', ''), sprint=int(row.get('sprint', 1)) if str(row.get('sprint', '1')).isdigit() else 1,
                        prog=int(row.get('prog', 0)) if str(row.get('prog', '0')).isdigit() else 0,
                        start=row.get('start', ''), end=row.get('end', ''), notes=row.get('notes', ''),
                        updatedAt=int(time.time() * 1000)
                    )
                    existing = db.query(DBTask).filter(DBTask.id == task_id).first()
                    if existing:
                        for key, value in new_task.__dict__.items():
                            if not key.startswith('_'): setattr(existing, key, value)
                    else:
                        db.add(new_task)
                    count += 1
            db.commit()
            return {"message": f"Successfully imported {count} {import_type} from CSV!"}
        
        # 2. Handle JSON Import (Full Backup)
        elif file.filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
            p_data = data.get("project")
            if p_data:
                existing_p = db.query(DBProject).filter(DBProject.id == p_data["id"]).first()
                if existing_p:
                    for k, v in p_data.items(): setattr(existing_p, k, v)
                else:
                    db.add(DBProject(**p_data))
                    
            tasks_added = 0
            for t_data in data.get("tasks", []):
                existing_t = db.query(DBTask).filter(DBTask.id == t_data["id"]).first()
                if existing_t:
                    for k, v in t_data.items(): setattr(existing_t, k, v)
                else:
                    db.add(DBTask(**t_data))
                tasks_added += 1
                
            db.commit()
            return {"message": f"Successfully restored project and {tasks_added} tasks!"}
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type.")
            
    except HTTPException:
        raise 
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")