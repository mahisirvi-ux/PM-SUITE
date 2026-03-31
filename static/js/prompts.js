/* ══════════════════════════════
   AI AGENTS
══════════════════════════════ */

const AGENTS = {
  planner:{ title:'Planner Agent', desc:'Sprint planning · backlog · estimation', grad:'linear-gradient(135deg,var(--rose),var(--violet))', chips:['Plan next sprint','Estimate story points','Velocity analysis','Backlog risks','Sprint goal'] },
  risk:{ title:'Risk Agent', desc:'RAID log · risk scoring · mitigation', grad:'linear-gradient(135deg,var(--red),var(--amber))', chips:['Review open risks','Mitigation plan','Risk summary','Escalation steps','Impact analysis'] },
  resource:{ title:'Resource Agent', desc:'Capacity · utilization · skills gap', grad:'linear-gradient(135deg,var(--violet),var(--teal))', chips:['Team utilization','Who is overloaded?','Rebalancing plan','Skills gap','Hire recommendation'] },
  delivery:{ title:'Delivery Agent', desc:'Go-live · milestones · forecast', grad:'linear-gradient(135deg,var(--teal),var(--violet))', chips:['Delivery forecast','Go-live readiness','Release checklist','Sprint priorities','Risk to deadline'] },
};
function buildCtx(){
  const p=curProj(); if(!p) return 'No project loaded.';
  const tasks=pTasks(p.id), risks=pRisks(p.id), res=pRes(p.id), ms=pMs(p.id);
  // -- P&L AI Context --
  entries = pPL(p.id);
  const rev = entries.filter(e=>e.type==='Revenue');
  const cost = entries.filter(e=>e.type==='Cost');
  const totActRev=rev.reduce((a,e)=>a+e.actual,0), totBudCost=cost.reduce((a,e)=>a+e.budget,0), totActCost=cost.reduce((a,e)=>a+e.actual,0);
  const profit=totActRev-totActCost, margin=totActRev?Math.round(profit/totActRev*100):0;

  return `PROJECT: ${p.name} | Status: ${p.status} | Sprint: ${p.sprint}/${p.sprints} | Start: ${p.start} | End: ${p.end}
TASKS: ${tasks.length} total | Done: ${tasks.filter(t=>t.status==='Done').length} | In Progress: ${tasks.filter(t=>t.status==='In Progress').length} | Blocked: ${tasks.filter(t=>t.status==='Blocked').length} | To Do: ${tasks.filter(t=>t.status==='To Do').length}
STORY POINTS: Total ${tasks.reduce((a,t)=>a+(+t.sp||0),0)} | Done: ${tasks.filter(t=>t.status==='Done').reduce((a,t)=>a+(+t.sp||0),0)}
BLOCKED TASKS: ${tasks.filter(t=>t.status==='Blocked').map(t=>`${t.name} (${t.sp||0} SP)`).join(', ')||'None'}
RISKS: ${risks.length} total | Open: ${risks.filter(r=>r.status==='Open').length} | Critical: ${risks.filter(r=>r.sev==='Critical').length}
OPEN RISKS: ${risks.filter(r=>r.status==='Open').map(r=>`${r.title} [${r.sev}]`).join(', ')||'None'}
TEAM: ${res.map(r=>`${r.name} (${r.role}, ${r.util}% util)`).join(', ')||'No team added'}
MILESTONES: ${ms.length} total | Done: ${ms.filter(m=>m.status==='d').length} | Active: ${ms.filter(m=>m.status==='a').length}
FINANCIALS (P&L): Revenue (Actual): ${totActRev} | Cost (Budget): ${totBudCost} | Cost (Actual): ${totActCost} | Net Profit: ${profit} | Margin: ${margin}%
P&L Entries: ${entries.slice(0, 10).map(e=>`[${e.type}/${e.cat}] ${e.desc}: Actual ${e.actual}`).join('; ')}`;
}