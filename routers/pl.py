from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import DBPL

router = APIRouter(prefix='/pl', tags=["Profit & Loss"])

@router.get("/{pid}", response_model=List[dict])
def read_pl(pid: str, db: Session = Depends(get_db)):
    entries = db.query(DBPL).filter(DBPL.pid == pid).all()
    return [{k: v for k, v in e.__dict__.items() if not k.startswith("_")} for e in entries]

@router.post("/")
def save_pl(entry: dict, db: Session = Depends(get_db)):
    db_entry = db.query(DBPL).filter(DBPL.id == entry['id']).first()
    if db_entry:
        for k, v in entry.items(): setattr(db_entry, k, v)
    else:
        db.add(DBPL(**entry))
    db.commit()
    return {"status": "success"}

@router.delete("/{id}")
def delete_pl(id: str, db: Session = Depends(get_db)):
    db.query(DBPL).filter(DBPL.id == id).delete()
    db.commit()
    return {"status": "deleted"}