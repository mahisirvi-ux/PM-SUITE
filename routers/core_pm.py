from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import csv
import json
import io
import time
import uuid
import traceback
from routers.auth import get_current_user
from database import get_db
from models import DBProject, DBTask, DBRisk, DBResource, DBMilestone, ProjectSchema, TaskSchema, DBUsers

router = APIRouter(tags=["Core PM"])

# --- PROJECTS ---
@router.get("/projects", response_model=List[ProjectSchema])
def read_projects(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    projects = db.query(DBProject).all()
    clean_projects = []
    
    for p in projects:
        # 1. Grab ALL columns from the database row safely
        p_dict = {k: v for k, v in p.__dict__.items() if not k.startswith("_")}
        
        # 2. Convert the datetime to an integer (milliseconds) for Pydantic/JS
        updated_val = p_dict.get("updatedAt")
        if isinstance(updated_val, datetime):
            p_dict["updatedAt"] = int(updated_val.timestamp() * 1000)
        elif not updated_val:
            p_dict["updatedAt"] = 0 
            
        clean_projects.append(p_dict)
        
    return clean_projects

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
    if task.assignee and task.assignee.strip():
        valid_res = db.query(DBResource).filter(
            DBResource.pid == task.pid,
            DBResource.name.ilike(task.assignee.strip())
        ).first()
        if not valid_res:
            raise HTTPException(status_code=400, detail=f"Cannot assign task to '{task.assignee}'. Please add them to the Resources tab first.")
        
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
import json # Ensure this is at the top of your file!

@router.get("/risks/{pid}", response_model=List[dict])
def read_risks(pid: str, db: Session = Depends(get_db)):
    risks = db.query(DBRisk).filter(DBRisk.pid == pid).all()
    clean_risks = []
    
    for r in risks:
        # Convert DB object to dictionary
        r_dict = {k: v for k, v in r.__dict__.items() if not k.startswith("_")}
        
        # --- BACKEND SMART PARSER ---
        # Intercept the mitigation text before it goes to the browser
        mit = r_dict.get("mit", "")
        if isinstance(mit, str) and mit.strip().startswith("["):
            try:
                # Force Python single quotes into JSON double quotes
                fixed_mit = mit.replace("'", '"')
                parsed = json.loads(fixed_mit)
                if isinstance(parsed, list):
                    # Join the array into a beautiful bulleted string
                    r_dict["mit"] = " • ".join(parsed)
            except:
                # Brute force fallback if the JSON is badly formatted
                clean_str = mit.replace('[', '').replace(']', '').replace('"', '').replace("'", "")
                r_dict["mit"] = " • ".join([s.strip() for s in clean_str.split(',') if s.strip()])
                
        clean_risks.append(r_dict)
        
    return clean_risks

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
def parse_int(val, default=0):
    """Helper to safely parse integers from CSV strings"""
    if val and str(val).strip().isdigit():
        return int(str(val).strip())
    return default

def get_col(row, *possible_names):
    """Helper for CSV Auto-Detection: Finds the first matching column name (case-insensitive)"""
    # Convert all CSV keys to lowercase and strip whitespace for flexible matching
    row_lower = {str(k).strip().lower(): v for k, v in row.items() if k}
    for name in possible_names:
        if name in row_lower:
            return row_lower[name]
    return ""

@router.post("/import")
async def import_data(
    file: UploadFile = File(...), 
    import_type: str = Form("tasks"), 
    pid: Optional[str] = Form(None), 
    db: Session = Depends(get_db)
):
    try:
        # ==========================================
        # 0. GLOBAL VALIDATION: Require Project
        # ==========================================
        # If importing anything other than 'projects' or a full 'all' backup, a project MUST be selected.
        if import_type not in ["projects", "all"]:
            if not pid or pid == "null" or str(pid).strip() == "":
                raise HTTPException(
                    status_code=400, 
                    detail=f"Please select a project from the top dropdown before importing {import_type}."
                )

        content = await file.read()
        
        # ==========================================
        # 1. HANDLE CSV IMPORT
        # ==========================================
        if file.filename.endswith('.csv'):
            
            # STRICT VALIDATION: Block CSVs for Risks, Resources, and Milestones
            if import_type not in ["projects", "tasks"]:
                raise HTTPException(status_code=400, detail=f"CSV uploads are strictly for Projects and Tasks. Please upload a JSON file for {import_type.capitalize()}.")

            decoded = content.decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(decoded))
            
            if not reader.fieldnames:
                raise HTTPException(status_code=400, detail="The CSV file is empty or unreadable.")

            count = 0
            
            if import_type == "projects":
                for row in reader:
                    name = get_col(row, 'name', 'title', 'project')
                    if not name: raise HTTPException(status_code=400, detail="Invalid CSV: Missing 'name' column.")
                    proj_id = get_col(row, 'id') or str(uuid.uuid4())[:8]
                    new_proj = DBProject(
                        id=proj_id, name=name, desc=get_col(row, 'desc', 'description'),
                        start=get_col(row, 'start', 'startdate', 'start_date'), end=get_col(row, 'end', 'enddate', 'end_date', 'duedate'),
                        sprint=parse_int(get_col(row, 'sprint', 'sprintnumber', 'iteration'), 1), sprints=parse_int(get_col(row, 'sprints'), 12),
                        status=get_col(row, 'status', 'state') or 'On Track', updatedAt=int(time.time() * 1000)
                    )
                    existing = db.query(DBProject).filter(DBProject.id == proj_id).first()
                    if existing:
                        for key, value in new_proj.__dict__.items():
                            if not key.startswith('_'): setattr(existing, key, value)
                    else: db.add(new_proj)
                    count += 1

            elif import_type == "tasks":
                # The global validation at the top already checked that pid exists!
                if not pid: raise HTTPException(status_code=400, detail="Please select a project first to import tasks.")
                valid_resources = [r.name.lower().strip() for r in db.query(DBResource).filter(DBResource.pid == pid).all()]
                for row in reader:
                    name = get_col(row, 'name', 'task', 'title')
                    if not name: raise HTTPException(status_code=400, detail="Invalid CSV: Missing 'name' column.")
                    # --- NEW STRICT VALIDATION ---
                    assignee = get_col(row, 'assignee', 'owner', 'assigned')
                    if assignee and str(assignee).strip() and str(assignee).strip().lower() not in valid_resources:
                        raise HTTPException(status_code=400, detail=f"Import Blocked: Assignee '{assignee}' is not in the Resources tab. Add them first.")
                    task_id = get_col(row, 'id') or str(uuid.uuid4())[:8]
                    new_task = DBTask(
                        id=task_id, pid=pid, name=name, ticket=get_col(row, 'ticket', 'ticketid'),
                        comp=get_col(row, 'comp', 'component', 'module'), status=get_col(row, 'status', 'state') or 'To Do',
                        prio=get_col(row, 'prio', 'priority') or 'Medium', sp=parse_int(get_col(row, 'sp', 'storypoints', 'points', 'estimate'), 0),
                        assignee=get_col(row, 'assignee', 'owner', 'assigned'), sprint=parse_int(get_col(row, 'sprint', 'sprintnumber', 'iteration'), 1),
                        prog=parse_int(get_col(row, 'prog', 'progress', 'completion', 'done'), 0), start=get_col(row, 'start', 'startdate', 'start_date'), 
                        end=get_col(row, 'end', 'enddate', 'end_date', 'duedate'), notes=get_col(row, 'notes', 'desc', 'description'),
                        updatedAt=int(time.time() * 1000)
                    )
                    existing = db.query(DBTask).filter(DBTask.id == task_id).first()
                    if existing:
                        for key, value in new_task.__dict__.items():
                            if not key.startswith('_'): setattr(existing, key, value)
                    else: db.add(new_task)
                    count += 1
                    
            db.commit()
            return {"message": f"Successfully imported {count} {import_type} from CSV!"}
        
        # ==========================================
        # 2. HANDLE JSON IMPORT (Bulletproof Restore)
        # ==========================================
        elif file.filename.endswith('.json'):
            data = json.loads(content.decode('utf-8'))
            
            # If the user uploaded a raw array [{}, {}], wrap it so it matches their dropdown choice
            if isinstance(data, list):
                data = {import_type: data}
            
            def restore_items(ModelClass, item_list, target_pid=None):
                if not item_list: return 0  # Catch null arrays
                
                added = 0
                # Get valid DB columns so extra JSON keys don't crash the server
                valid_columns = [c.name for c in ModelClass.__table__.columns]

                for item_data in item_list:
                    if target_pid: 
                        item_data["pid"] = target_pid
                        
                    # Safe ID extraction (generates a new one if missing)
                    item_id = item_data.get("id") or str(uuid.uuid4())[:8]
                    item_data["id"] = item_id

                    # Clean the data: Only keep keys that actually exist in our database table
                    clean_data = {k: v for k, v in item_data.items() if k in valid_columns}

                    existing = db.query(ModelClass).filter(ModelClass.id == item_id).first()
                    if existing:
                        for k, v in clean_data.items(): setattr(existing, k, v)
                    else: 
                        db.add(ModelClass(**clean_data))
                    added += 1
                return added

            # ... restore_items helper function ...
            
            imported_msgs = []
            active_pid = pid if import_type != "all" else None
            
            if import_type in ["projects", "all"]:
                p_data = data.get("project")
                if p_data:
                    restore_items(DBProject, [p_data])
                    imported_msgs.append("1 Project")
                    
            # CRITICAL: IMPORT RESOURCES BEFORE TASKS
            if import_type in ["resources", "all"]:
                count = restore_items(DBResource, data.get("resources", []), active_pid)
                if count: imported_msgs.append(f"{count} Resources")

            # NOW IMPORT TASKS WITH VALIDATION
            if import_type in ["tasks", "all"]:
                # Fetch the resources we just imported!
                target = active_pid or p_data.get("id") if p_data else None
                valid_res = [r.name.lower().strip() for r in db.query(DBResource).filter(DBResource.pid == target).all()] if target else []
                
                tasks_to_import = data.get("tasks", [])
                for t in tasks_to_import:
                    ast = t.get("assignee")
                    if ast and str(ast).strip() and str(ast).strip().lower() not in valid_res:
                         raise HTTPException(status_code=400, detail=f"JSON Blocked: Task assigned to '{ast}', but they are not a resource.")
                
                count = restore_items(DBTask, tasks_to_import, active_pid)
                if count: imported_msgs.append(f"{count} Tasks")
                
            if import_type in ["risks", "all"]:
                count = restore_items(DBRisk, data.get("risks", []), active_pid)
                if count: imported_msgs.append(f"{count} Risks")
                
            if import_type in ["milestones", "all"]:
                count = restore_items(DBMilestone, data.get("milestones", []), active_pid)
                if count: imported_msgs.append(f"{count} Milestones")
                
            db.commit()
            
            if not imported_msgs:
                raise HTTPException(status_code=400, detail=f"No valid '{import_type}' data found inside the uploaded JSON file.")
                
            return {"message": f"Successfully imported: {', '.join(imported_msgs)}!"}
            
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Please upload .csv or .json")
            
    except HTTPException:
        raise 
    except Exception as e:
        db.rollback()
        # This will print the EXACT line of code that failed in your terminal!
        print("\n--- IMPORT ERROR TRACEBACK ---")
        traceback.print_exc()
        print("------------------------------\n")
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")