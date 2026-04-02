/* ══════════════════════════════
   AI AGENTS
══════════════════════════════ */

const AGENTS = {
  planner:{ title:'Planner Agent', desc:'Sprint planning · backlog · estimation', grad:'linear-gradient(135deg,var(--rose),var(--violet))', chips:['Plan next sprint','Estimate story points','Velocity analysis','Backlog risks','Sprint goal'] },
  risk:{ title:'Risk Agent', desc:'RAID log · risk scoring · mitigation', grad:'linear-gradient(135deg,var(--red),var(--amber))', chips:['Review open risks','Mitigation plan','Risk summary','Escalation steps','Impact analysis'] },
  resource:{ title:'Resource Agent', desc:'Capacity · utilization · skills gap', grad:'linear-gradient(135deg,var(--violet),var(--teal))', chips:['Team utilization','Who is overloaded?','Rebalancing plan','Skills gap','Hire recommendation'] },
  delivery:{ title:'Delivery Agent', desc:'Go-live · milestones · forecast', grad:'linear-gradient(135deg,var(--teal),var(--violet))', chips:['Delivery forecast','Go-live readiness','Release checklist','Sprint priorities','Risk to deadline'] },
  finance: {
        title: "Finance P&L Agent",
        desc: "Budget · actuals · margin · cost optimisation",
        color: "linear-gradient(135deg, #059669, #0f766e)", // Dark emerald/teal
        icon: `<svg viewBox="0 0 24 24"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`,
        chips: ['P&L summary', 'Budget variance analysis', 'Cost overrun alert', 'Revenue forecast', 'Margin improvement', 'Cash flow outlook', 'Cost reduction ideas'],
        init: (p) => {
            if(!p) return "Select a project to analyze financial data.";
            
            // Safely fetch P&L data
            const entries = typeof pPL === 'function' ? pPL(p.id) : [];
            const rev = entries.filter(e=>e.type==='Revenue');
            const cost = entries.filter(e=>e.type==='Cost');
            const totActRev = rev.reduce((a,e)=>a+e.actual,0);
            const totActCost = cost.reduce((a,e)=>a+e.actual,0);
            const profit = totActRev - totActCost;
            const margin = totActRev ? Math.round(profit/totActRev*100) : 0;
            const overruns = cost.filter(e => e.actual > e.budget);
            
            // Currency formatter fallback
            const fmt = typeof fmtINR === 'function' ? fmtINR : (v) => '₹'+v.toLocaleString('en-IN');

            let msg = `<strong style="color:var(--rose)">Finance P&L Agent online.</strong> Here's your instant snapshot for <strong style="color:var(--rose)">${p.name}</strong>:\n\n`;
            msg += `• <strong style="color:var(--rose)">Revenue (Actual):</strong> ${fmt(totActRev)} | <strong style="color:var(--rose)">Costs (Actual):</strong> ${fmt(totActCost)}\n`;
            msg += `• <strong style="color:var(--rose)">Net Profit:</strong> ${fmt(profit)} | <strong style="color:var(--rose)">Margin:</strong> ${margin}%\n`;

            if(overruns.length > 0) {
                msg += `• <strong style="color:var(--rose)">Cost overruns:</strong> ${overruns.length} line item(s) over budget — ${overruns.map(o=>o.desc).join(', ')}\n\n`;
            } else {
                msg += `• <strong style="color:var(--rose)">Cost overruns:</strong> None currently detected.\n\n`;
            }
            msg += `Ask me for variance analysis, margin improvement ideas, cost optimisation, or a full P&L report.`;
            return msg;
        }
    },
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