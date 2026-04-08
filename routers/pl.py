from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import DBPL

router = APIRouter(prefix='/pl', tags=["Profit & Loss"])

@router.get("/{pid}")
def read_pl(pid: str, db: Session = Depends(get_db)):
    entries = db.query(DBPL).filter(DBPL.pid == pid).all()
    raw_entries = [{k: v for k, v in e.__dict__.items() if not k.startswith("_")} for e in entries]
    
    # Seprate types
    rev = [e for e in raw_entries if e["type"] == "Revenue"]
    cost = [e for e in raw_entries if e["type"] == "Cost"]

    # calculate totals
    totBudRev = sum(e["budget"] for e in rev)
    totActRev = sum(e["actual"] for e in rev)
    totFcstRev = sum(e["forecast"] for e in rev)

    totBudCost = sum(e["budget"] for e in cost)
    totActCost = sum(e["actual"] for e in cost)
    totFcstCost = sum(e["forecast"] for e in cost)

    # margin and varainces
    grossActProfit = totActRev - totActCost
    grossBudProfit = totBudRev - totBudCost
    grossFcstProfit = totFcstRev - totFcstCost

    actMargin = round((grossActProfit/totActRev) * 100) if totActRev else 0
    budMargin = round((grossBudProfit/totBudRev) * 100) if totBudRev else 0
    budgetUsed = round((totActCost/totBudCost) * 100) if totBudCost else 0

    revenueVar = totActRev - totBudRev
    costVar = totActCost - totBudCost
    
    # Trend for the chart
    periods = sorted(list(set(e.get("period") or "Unset" for e in raw_entries)))
    trend = []
    max_val = 1
    for pr in periods:
        p_ents = [e for e in raw_entries if (e.get("period") or "Unset") == pr]
        b = sum(e["budget"] for e in p_ents)
        a = sum(e["actual"] for e in p_ents)
        f = sum(e["forecast"] for e in p_ents)
        trend.append({"period": pr, "budget": b, "actual": a, "forecast": f})
        max_val = max(max_val, b, a, f)

    # --- CATEGORY BREAKDOWNS ---
    cats = ['Labour','Infrastructure','Licensing','Services','Consulting','Sales','Other']
    
    def calc_cat(cat_name, entries_list):
        return {
            "cat": cat_name,
            "budget": sum(e["budget"] for e in entries_list if e.get("cat") == cat_name),
            "actual": sum(e["actual"] for e in entries_list if e.get("cat") == cat_name)
        }

    rev_cats = [calc_cat(c, rev) for c in cats]
    cost_cats = [calc_cat(c, cost) for c in cats]

    # --- RETURN THE MASTER PAYLOAD ---
    return {
        "entries": raw_entries,
        "dashboard": {
            "totals": {
                "totBudRev": totBudRev, "totActRev": totActRev, "totFcstRev": totFcstRev,
                "totBudCost": totBudCost, "totActCost": totActCost, "totFcstCost": totFcstCost,
                "grossActProfit": grossActProfit, "grossFcstProfit": grossFcstProfit,
                "actMargin": actMargin, "budMargin": budMargin, "budgetUsed": budgetUsed,
                "revenueVar": revenueVar, "costVar": costVar
            },
            "chart": { "trend": trend, "max_val": max_val },
            "categories": {
                "Revenue": [x for x in rev_cats if x["budget"] or x["actual"]],
                "Cost": [x for x in cost_cats if x["budget"] or x["actual"]]
            }
        }
    }

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