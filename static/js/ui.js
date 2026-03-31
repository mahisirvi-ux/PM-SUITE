/* ══════════════════════════════
   UI ENGINE (Rendering & Navigation)
══════════════════════════════ */

/* --- NAVIGATION & TOASTS --- */
const TABS = ['dashboard','tasks','gantt','chat','risks','resources','delivery','import', 'pl'];

function nav(tab, agent){
    TABS.forEach(t => document.getElementById('p-'+t).classList.toggle('on', t === tab));
    document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
    const active = document.querySelector(`.ni[data-tab="${tab}"]`);
    if(active) active.classList.add('on');
    if(agent && typeof setAgent === "function") setAgent(agent, document.querySelector(`.atab[onclick*="${agent}"]`));
    refresh();
}

function toast(msg, type=''){
    const t = document.getElementById('toast');
    t.textContent = msg; 
    t.className = 'on' + (type ? ' '+type : '');
    clearTimeout(t._t); 
    t._t = setTimeout(() => t.className = '', 3000);
}

/* --- MODALS --- */
function openM(id){ document.getElementById(id).classList.add('open'); }
function closeM(id){ document.getElementById(id).classList.remove('open'); }

function openProjModal(id){
    const p = id ? getProjects().find(x => x.id === id) : null;
    document.getElementById('mp-ttl').textContent = p ? 'Edit Project' : 'New Project';
    document.getElementById('mp-id').value = p?.id || '';
    document.getElementById('mp-name').value = p?.name || '';
    document.getElementById('mp-desc').value = p?.desc || '';
    document.getElementById('mp-start').value = p?.start || '';
    document.getElementById('mp-end').value = p?.end || '';
    document.getElementById('mp-sprint').value = p?.sprint || 1;
    document.getElementById('mp-sprints').value = p?.sprints || 12;
    document.getElementById('mp-status').value = p?.status || 'On Track';
    openM('m-proj');
}

function openTaskModal(id){
    const t = id ? getAllTasks().find(x=>x.id===id) : null;
    document.getElementById('mt-ttl').textContent = t ? 'Edit Task' : 'Add Task';
    document.getElementById('mt-id').value = t?.id || '';
    document.getElementById('mt-name').value = t?.name || '';
    document.getElementById('mt-ticket').value = t?.ticket || '';
    document.getElementById('mt-comp').value = t?.comp || '';
    document.getElementById('mt-assignee').value = t?.assignee || '';
    document.getElementById('mt-sprint').value = t?.sprint ?? (curProj()?.sprint||1);
    document.getElementById('mt-sp').value = t?.sp ?? 5;
    document.getElementById('mt-prio').value = t?.prio || 'Medium';
    document.getElementById('mt-stat').value = t?.status || 'To Do';
    const pg = +t?.prog||0; 
    document.getElementById('mt-prog').value = pg; 
    document.getElementById('mt-pv').textContent = pg+'%';
    document.getElementById('mt-start').value = t?.start || '';
    document.getElementById('mt-end').value = t?.end || '';
    document.getElementById('mt-notes').value = t?.notes || '';
    openM('m-task');
}

function openRiskModal(id){
    const r = id ? getAllRisks().find(x=>x.id===id) : null;
    document.getElementById('mr-ttl').textContent = r ? 'Edit Risk' : 'Add Risk';
    document.getElementById('mr-id').value = r?.id||'';
    document.getElementById('mr-title').value = r?.title||'';
    document.getElementById('mr-desc').value = r?.desc||'';
    document.getElementById('mr-sev').value = r?.sev||'Medium';
    document.getElementById('mr-cat').value = r?.cat||'Technical';
    document.getElementById('mr-prob').value = r?.prob||'Medium';
    document.getElementById('mr-imp').value = r?.imp||'Medium';
    document.getElementById('mr-owner').value = r?.owner||'';
    document.getElementById('mr-stat').value = r?.status||'Open';
    document.getElementById('mr-mit').value = r?.mit||'';
    openM('m-risk');
}

function openResModal(id){
    const r = id ? getAllRes().find(x=>x.id===id) : null;
    document.getElementById('mres-ttl').textContent = r ? 'Edit Member' : 'Add Team Member';
    document.getElementById('mres-id').value = r?.id||'';
    document.getElementById('mres-name').value = r?.name||'';
    document.getElementById('mres-role').value = r?.role||'';
    const u = r?.util??80; 
    document.getElementById('mres-util').value = u; 
    document.getElementById('mres-uv').textContent = u+'%';
    document.getElementById('mres-cap').value = r?.cap??40;
    document.getElementById('mres-skills').value = (r?.skills||[]).join(', ');
    document.getElementById('mres-color').value = r?.color||'linear-gradient(135deg,#ff2d6b,#ff6b9d)';
    openM('m-res');
}

function openMsModal(id){
    const m = id ? getAllMs().find(x=>x.id===id) : null;
    document.getElementById('mms-id').value = m?.id||'';
    document.getElementById('mms-title').value = m?.title||'';
    document.getElementById('mms-date').value = m?.date||'';
    document.getElementById('mms-stat').value = m?.status||'p';
    document.getElementById('mms-tasks').value = (m?.tasks||[]).join('\n');
    openM('m-ms');
}

function buildProjPicker(){
    const sel = document.getElementById('proj-sel');
    const projs = getProjects();
    if(!projs.length){ sel.innerHTML = '<option value="">— No projects —</option>'; return; }
    sel.innerHTML = projs.map(p => `<option value="${p.id}"${p.id === curPid ? ' selected':''}>${p.name}</option>`).join('');
}

/* --- FILE IMPORT & EXPORT UI TRIGGERS --- */
function onFileInput(e) {
    const file = e.target.files[0];
    if (file && typeof uploadFile === 'function') uploadFile(file);
    e.target.value = ""; 
}

function onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file && typeof uploadFile === 'function') uploadFile(file);
}

function exportAll() {
    if(!curPid) return toast("No project to export", "err");
    const data = { project: curProj(), tasks: pTasks(curPid) };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `PM_Export_${curPid}.json`;
    a.click();
}

function exportTasks() {
    const tasks = pTasks(curPid);
    if(!tasks.length) return toast("No tasks to export", "err");
    const headers = ["name", "ticket", "comp", "status", "priority", "sp", "assignee"];
    const csv = [
        headers.join(","),
        ...tasks.map(t => [ `"${t.name||''}"`, `"${t.ticket||''}"`, `"${t.comp||''}"`, `"${t.status||''}"`, `"${t.prio||''}"`, t.sp||0, `"${t.assignee||''}"` ].join(","))
    ].join("\n");
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Tasks_${curPid}.csv`;
    a.click();
}

/* --- ORCHESTRATOR --- */
function refresh(){
    const p = curProj();
    refreshTopbar(p);
    renderDash(p);
    renderTasks();
    renderGantt();
    renderRisks();
    renderResources();
    renderDelivery();
    renderPL();
    if(typeof refreshChatSide === "function") refreshChatSide(p);
    refreshBadges(p);
    refreshDataSummary();
}

function refreshTopbar(p){
    document.getElementById('t-sprint').textContent = p ? `Sprint ${p.sprint}/${p.sprints}` : '—';
    document.getElementById('t-status').textContent = p ? p.status : '—';
    document.getElementById('footer-txt').textContent = `PM Suite v4.0 · ${getProjects().length} project(s) · DB Connected`;
}

function refreshBadges(p){
    const tc = p ? pTasks(p.id).filter(t => t.status !== 'Done').length : 0;
    const rc = p ? pRisks(p.id).filter(r => r.status === 'Open' || r.status === 'Mitigating').length : 0;
    document.getElementById('badge-tasks').textContent = tc;
    document.getElementById('badge-risks').textContent = rc;
    document.getElementById('badge-risks2').textContent = rc;
}

function refreshDataSummary(){
    const projs = getProjects();
    const el = document.getElementById('data-summary');
    if(!el) return;
    el.innerHTML = [
        ['Projects', projs.length],
        ['Total Tasks', getAllTasks().length],
        ['Total Risks', getAllRisks().length],
        ['Team Members', getAllRes().length],
        ['Milestones', getAllMs().length],
        ['Storage Status', 'PostgreSQL (Active)']
    ].map(([l,v]) => `<div class="csrow"><span class="csl">${l}</span><span class="csv">${v}</span></div>`).join('');
}

/* --- RENDERERS --- */
const STAT_C = { Done:'var(--green)', 'In Progress':'var(--violet)', Review:'var(--amber)', 'To Do':'var(--ink4)', Blocked:'var(--red)' };
const PRIO_C = { Critical:'var(--red)', High:'var(--amber)', Medium:'var(--violet)', Low:'var(--teal)' };
const STAT_TAG = { Done:'tgrn', 'In Progress':'tvio', Review:'tamb', 'To Do':'tink', Blocked:'tred' };
const PRIO_TAG = { Critical:'tred', High:'tamb', Medium:'tvio', Low:'tteal' };
const uc = u => u>=90?'var(--red)':u>=75?'var(--amber)':'var(--green)';

function renderDash(p){
    document.getElementById('d-eye').textContent = p ? `Sprint ${p.sprint} / ${p.sprints}` : 'No project selected';
    document.getElementById('d-sub').textContent = p ? `${p.name} · ${p.status}` : 'Create or import a project to begin';
    if(!p){
        document.getElementById('dash-kpis').innerHTML = `<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg><h3>No project selected</h3><p>Click "New Project" or import data to get started.</p></div>`;
        document.getElementById('d-tasks').innerHTML = '';
        return;
    }
    const tasks = pTasks(p.id), risks = pRisks(p.id);
    const done = tasks.filter(t => t.status === 'Done').length;
    const blocked = tasks.filter(t => t.status === 'Blocked').length;
    const tsp = tasks.reduce((a,t)=>a+(+t.sp||0),0);
    const dsp = tasks.filter(t=>t.status==='Done').reduce((a,t)=>a+(+t.sp||0),0);
    const health = tasks.length ? Math.round(done/tasks.length*100) : 0;
    document.getElementById('dash-kpis').innerHTML = `
        <div class="kcard k1"><div class="kl">Story Points</div><div class="kv">${dsp}</div><div class="kd kfl">of ${tsp} total</div></div>
        <div class="kcard k2"><div class="kl">Tasks Done</div><div class="kv">${done}</div><div class="kd kfl">of ${tasks.length}</div></div>
        <div class="kcard k3"><div class="kl">Open Risks</div><div class="kv">${risks.filter(r=>r.status==='Open').length}</div><div class="kd kdn">${risks.filter(r=>r.sev==='Critical').length} critical</div></div>
        <div class="kcard k4"><div class="kl">Blockers</div><div class="kv">${blocked}</div><div class="kd ${blocked?'kdn':'ku'}">${blocked?'Needs attention':'All clear'}</div></div>
        <div class="kcard k5"><div class="kl">Health</div><div class="kv">${health}%</div><div class="kd ${health>=70?'ku':health>=40?'kfl':'kdn'}">${health>=70?'↑ On Track':health>=40?'Caution':'↓ At Risk'}</div></div>
    `;
    document.getElementById('d-tasks').innerHTML = tasks.slice(-6).reverse().map(t => taskRowShort(t)).join('') ||
        `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--ink4)">No tasks yet. <a href="#" onclick="openTaskModal()" style="color:var(--rose)">Add one →</a></td></tr>`;
    let sprints = [], maxSP = 1;
    for(let s = Math.max(1, p.sprint-6); s <= p.sprint; s++){
        const sp = tasks.filter(t=>+t.sprint===s&&t.status==='Done').reduce((a,t)=>a+(+t.sp||0),0);
        sprints.push({s,sp}); if(sp>maxSP) maxSP=sp;
    }
    document.getElementById('vel-bars').innerHTML = sprints.map((x,i) => {
        const h = Math.max(6, Math.round(x.sp/maxSP*52));
        return `<div style="flex:1;height:${h}px;border-radius:3px 3px 0 0;background:${i===sprints.length-1?'linear-gradient(180deg,var(--rose),var(--violet))':'var(--bg)'};border:1px solid var(--b);transition:all .3s" title="Sprint ${x.s}: ${x.sp} pts"></div>`;
    }).join('');
    document.getElementById('vel-lbls').innerHTML = sprints.map((x,i) =>
        `<span style="font-size:9px;color:${i===sprints.length-1?'var(--rose)':'var(--ink4)'};font-family:'JetBrains Mono',monospace;font-weight:${i===sprints.length-1?'800':'400'}">S${x.s}</span>`
    ).join('');
    document.getElementById('vel-note').textContent = `S${sprints[sprints.length-1]?.s||'—'}: ${sprints[sprints.length-1]?.sp||0} pts completed`;
    const statuses = ['Done','In Progress','Review','To Do','Blocked'];
    document.getElementById('d-breakdown').innerHTML = statuses.map(s => {
        const n = tasks.filter(t=>t.status===s).length;
        const pct = tasks.length ? Math.round(n/tasks.length*100) : 0;
        return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:3px"><span style="color:var(--ink2)">${s}</span><span style="color:${STAT_C[s]}">${n} (${pct}%)</span></div>
            <div class="pgt"><div class="pgf" style="width:${pct}%;background:${STAT_C[s]}"></div></div>
        </div>`;
    }).join('');
}

function taskRowShort(t){
    const p = +t.prog||0;
    return `<tr>
        <td><div class="tn">${t.name}</div><div class="ts">${t.ticket||'—'}</div></td>
        <td style="font-size:12px;color:var(--ink4)">${t.assignee||'—'}</td>
        <td><span class="tag ${PRIO_TAG[t.prio]||'tink'}">${t.prio||'—'}</span></td>
        <td><span class="tag ${STAT_TAG[t.status]||'tink'}">${t.status||'—'}</span></td>
        <td style="min-width:80px"><div class="pg"><div class="pgt"><div class="pgf" style="width:${p}%;background:${STAT_C[t.status]||'var(--violet)'}"></div></div><span class="pgv">${p}%</span></div></td>
        <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink4)">${t.sp||0}</td>
    </tr>`;
}

function renderTasks(){
    const p = curProj();
    const tbody = document.getElementById('task-tbody');
    if(!p){ tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--ink4)">No project selected.</td></tr>`; return; }
    const spSel = document.getElementById('tf-sprint');
    const sprints = [...new Set(pTasks(p.id).map(t=>t.sprint))].sort((a,b)=>a-b);
    const curSp = spSel.value;
    spSel.innerHTML = '<option value="">All Sprints</option>' + sprints.map(s=>`<option value="${s}"${s==curSp?' selected':''}>Sprint ${s}</option>`).join('');
    let tasks = pTasks(p.id);
    const fs = document.getElementById('tf-status')?.value||'';
    const fsp = document.getElementById('tf-sprint')?.value||'';
    if(fs) tasks = tasks.filter(t=>t.status===fs);
    if(fsp) tasks = tasks.filter(t=>+t.sprint===+fsp);
    tbody.innerHTML = tasks.length ? tasks.map(t=>{
        const pg = +t.prog||0;
        return `<tr>
            <td class="ts">${t.ticket||'—'}</td>
            <td><div class="tn">${t.name}</div><div class="ts">${t.comp||''}</div></td>
            <td style="font-size:12px;color:var(--ink4)">${t.assignee||'—'}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">S${t.sprint||1}</td>
            <td><span class="tag ${PRIO_TAG[t.prio]||'tink'}">${t.prio||'—'}</span></td>
            <td><span class="tag ${STAT_TAG[t.status]||'tink'}">${t.status||'—'}</span></td>
            <td style="min-width:90px"><div class="pg"><div class="pgt"><div class="pgf" style="width:${pg}%;background:${STAT_C[t.status]||'var(--violet)'}"></div></div><span class="pgv">${pg}%</span></div></td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink4)">${t.sp||0}</td>
            <td style="font-size:10px;color:var(--ink4);font-family:'JetBrains Mono',monospace">${t.start||''}${t.end?'→'+t.end:''}</td>
            <td><div style="display:flex;gap:3px"><button class="btn btn-ghost btn-xs" onclick="openTaskModal('${t.id}')">Edit</button><button class="btn btn-danger btn-xs" onclick="delTask('${t.id}')">Del</button></div></td>
        </tr>`;
    }).join('') : `<tr><td colspan="10"><div class="empty"><svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg><h3>No tasks</h3><p>Add your first task or import data.</p></div></td></tr>`;
}

function renderGantt(){
    const p = curProj();
    const tbody = document.getElementById('gantt-tbody');
    if(!p){ tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--ink4)">No project selected.</td></tr>`; return; }
    const tasks = pTasks(p.id).filter(t=>t.start&&t.end);
    if(!tasks.length){ tbody.innerHTML = `<tr><td colspan="4"><div class="empty"><svg viewBox="0 0 24 24"><path d="M3 3h18v2H3V3zm0 8h12v2H3v-2zm0 8h15v2H3v-2z"/></svg><h3>No timeline data</h3><p>Add start and end dates to tasks to see the Gantt chart.</p></div></td></tr>`; return; }
    const dates = tasks.flatMap(t=>[new Date(t.start),new Date(t.end)]);
    const minD = new Date(Math.min(...dates)), maxD = new Date(Math.max(...dates));
    const span = Math.max(1, (maxD-minD)/864e5) + 7;
    const today = new Date();
    const todayPct = Math.min(100,Math.max(0, (today-minD)/864e5/span*100));
    document.getElementById('gantt-range').textContent = `${minD.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} → ${maxD.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`;
    const c = { Done:'var(--green)', Blocked:'var(--red)', 'In Progress':'var(--violet)', Review:'var(--amber)', 'To Do':'var(--ink4)' };
    tbody.innerHTML = tasks.map(t => {
        const s=new Date(t.start), e=new Date(t.end);
        const l = Math.max(0,(s-minD)/864e5/span*100).toFixed(1);
        const w = Math.max(1,(e-s)/864e5/span*100).toFixed(1);
        return `<tr>
            <td><div class="tn" style="font-size:12.5px">${t.name}</div><div class="ts">${t.ticket||''}</div></td>
            <td style="font-size:11px;color:var(--ink4)">${t.assignee||'—'}</td>
            <td><span class="tag ${STAT_TAG[t.status]||'tink'}" style="font-size:9px">${t.status}</span></td>
            <td style="padding:4px 10px"><div class="gtrack">
                <div class="gbar" style="left:${l}%;width:${w}%;background:${c[t.status]||'var(--ink4)'}" title="${t.name}">${t.name}</div>
                <div class="gtoday" style="left:${todayPct}%"></div>
            </div></td>
        </tr>`;
    }).join('');
}

function renderRisks(){
    const p = curProj(); const el = document.getElementById('risk-list');
    if(!p){ el.innerHTML='<div class="empty"><h3>No project</h3></div>'; return; }
    const risks = pRisks(p.id);
    if(!risks.length){ el.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg><h3>No risks logged</h3><p>Add risks to start tracking them.</p></div>`; return; }
    const sc={Critical:'var(--red)',High:'var(--amber)',Medium:'var(--amber)',Low:'var(--teal)'};
    const sb={Critical:'var(--redd)',High:'var(--amberd)',Medium:'var(--amberd)',Low:'var(--teald)'};
    el.innerHTML = risks.map(r=>`
        <div class="rcard">
            <div style="width:34px;height:34px;border-radius:8px;background:${sb[r.sev]};color:${sc[r.sev]};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${r.sev==='Critical'?'🔴':r.sev==='High'?'🟠':'🟡'}</div>
            <div style="flex:1">
                <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:2px">${r.title}</div>
                <div style="font-size:11.5px;color:var(--ink4);margin-bottom:7px;line-height:1.5">${r.desc||''}</div>
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="tag ${r.sev==='Critical'?'tred':r.sev==='High'?'tamb':'tamb'}">${r.sev}</span>
                    <span class="tag tvio">${r.cat||'Other'}</span>
                    <span class="tag ${r.status==='Open'?'tred':r.status==='Mitigating'?'tamb':'tgrn'}">${r.status}</span>
                    <span style="font-size:10px;color:var(--ink4);font-family:'JetBrains Mono',monospace">Owner: ${r.owner||'—'}</span>
                    <div style="margin-left:auto;display:flex;gap:4px">
                        <button class="btn btn-ghost btn-xs" onclick="chatAsk('risk','Give detailed mitigation steps for this risk: ${r.title.replace(/'/g,"\\'")}')">AI ↗</button>
                        <button class="btn btn-ghost btn-xs" onclick="openRiskModal('${r.id}')">Edit</button>
                        <button class="btn btn-danger btn-xs" onclick="delRisk('${r.id}')">Del</button>
                    </div>
                </div>
                ${r.mit?`<div style="margin-top:7px;font-size:11px;color:var(--green);background:var(--greend);border-radius:5px;padding:5px 9px">💡 ${r.mit}</div>`:''}
            </div>
        </div>`).join('');
}

function renderResources(){
    const p = curProj();
    if(!p){ document.getElementById('res-grid').innerHTML=''; document.getElementById('res-tbody').innerHTML=''; return; }
    const res = pRes(p.id); const tasks = pTasks(p.id);
    if(!res.length){
        document.getElementById('res-grid').innerHTML=`<div class="empty" style="grid-column:1/-1"><svg viewBox="0 0 24 24"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg><h3>No team members</h3><p>Add your team to track capacity and allocation.</p></div>`;
        document.getElementById('res-tbody').innerHTML=''; return;
    }
    document.getElementById('res-grid').innerHTML = res.map(m=>{
        const init = m.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
        return `<div class="res-card">
            <div class="r-av" style="background:${m.color}">${init}</div>
            <div style="font-size:13px;font-weight:700;color:var(--ink)">${m.name}</div>
            <div style="font-size:11px;color:var(--ink4);margin-bottom:9px">${m.role}</div>
            <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;margin-bottom:3px"><span style="color:var(--ink4)">Utilization</span><span style="color:${uc(m.util)}">${m.util}%</span></div>
            <div class="ut"><div class="uf" style="width:${m.util}%;background:${uc(m.util)}"></div></div>
            <div style="display:flex;flex-wrap:wrap;gap:3px">${(m.skills||[]).slice(0,3).map(s=>`<span class="tag tvio" style="font-size:9px">${s}</span>`).join('')}</div>
        </div>`;
    }).join('');
    document.getElementById('res-tbody').innerHTML = res.map(m=>{
        const init = m.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
        const mt = tasks.filter(t=>t.assignee&&t.assignee.toLowerCase().includes(m.name.split(' ')[0].toLowerCase())).length;
        const st = m.util>=90?'<span class="tag tred">Overloaded</span>':m.util>=75?'<span class="tag tamb">Busy</span>':'<span class="tag tgrn">Available</span>';
        return `<tr>
            <td><div style="display:flex;align-items:center;gap:7px"><div style="width:24px;height:24px;border-radius:7px;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff">${init}</div><span style="font-weight:600">${m.name}</span></div></td>
            <td style="color:var(--ink4);font-size:12px">${m.role}</td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${mt}</td>
            <td>${(m.skills||[]).slice(0,3).map(s=>`<span class="tag tvio" style="font-size:9px;margin-right:2px">${s}</span>`).join('')}</td>
            <td><div class="pg"><div class="pgt"><div class="pgf" style="width:${m.util}%;background:${uc(m.util)}"></div></div><span class="pgv" style="color:${uc(m.util)}">${m.util}%</span></div></td>
            <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--ink4)">${m.cap}h/wk</td>
            <td>${st}</td>
            <td><div style="display:flex;gap:3px"><button class="btn btn-ghost btn-xs" onclick="openResModal('${m.id}')">Edit</button><button class="btn btn-danger btn-xs" onclick="delRes('${m.id}')">Del</button></div></td>
        </tr>`;
    }).join('');
}

function renderDelivery(){
    const p = curProj();
    if(!p){ document.getElementById('h-conf').textContent='—'; return; }
    const tasks=pTasks(p.id), ms=pMs(p.id);
    const done=tasks.filter(t=>t.status==='Done').length, total=tasks.length||1;
    const blocked=tasks.filter(t=>t.status==='Blocked').length;
    const conf=Math.max(0,Math.round(done/total*100)-blocked*5);
    document.getElementById('del-sub').textContent=`${p.name} · Target: ${p.end||'TBD'}`;
    document.getElementById('h-conf').textContent=conf+'%';
    document.getElementById('h-conf').style.color=conf>=70?'var(--green)':conf>=40?'var(--amber)':'var(--red)';
    document.getElementById('h-conf-s').textContent=blocked>0?`⚠ ${blocked} blocker(s)`:'No blockers';
    document.getElementById('h-done').textContent=`${done}/${total}`;
    document.getElementById('h-done-s').textContent=Math.round(done/total*100)+'% complete';
    const dm=ms.filter(m=>m.status==='d').length;
    document.getElementById('h-ms').textContent=`${dm}/${ms.length}`;
    document.getElementById('h-ms-s').textContent=ms.length?Math.round(dm/(ms.length||1)*100)+'% done':'No milestones';
    document.getElementById('ms-list').innerHTML=ms.length?ms.map(m=>`
        <div class="mti">
            <div class="mtdot ${m.status||'p'}"></div>
            <div class="mtt">${m.title}</div>
            <div class="mtd">${m.date||'No date'}</div>
            <div class="mt-tasks">${(m.tasks||[]).map(t=>`<div class="mt-task">${t}</div>`).join('')}</div>
            <div style="display:flex;gap:4px;margin-top:5px">
                <button class="btn btn-ghost btn-xs" onclick="openMsModal('${m.id}')">Edit</button>
                <button class="btn btn-danger btn-xs" onclick="delMs('${m.id}')">Del</button>
            </div>
        </div>`).join(''):`<div class="empty" style="padding:16px"><h3>No milestones</h3><p>Add milestones to track delivery.</p></div>`;
    const statuses=['Done','In Progress','Review','To Do','Blocked'];
    document.getElementById('del-breakdown').innerHTML=statuses.map(s=>{
        const n=tasks.filter(t=>t.status===s).length; const pct=total>1?Math.round(n/total*100):0;
        return `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;margin-bottom:3px"><span style="color:var(--ink2)">${s}</span><span style="color:${STAT_C[s]}">${n} (${pct}%)</span></div><div class="pgt"><div class="pgf" style="width:${pct}%;background:${STAT_C[s]}"></div></div></div>`;
    }).join('');
}

function showSchema(type, btn){
    const SCHEMAS = { json: `{"project": {"id": "proj_001"}}`, csv: `name,ticket,comp\nPayment Gateway,BE-1042,payments` };
    document.querySelectorAll('.stab').forEach(b=>b.classList.remove('on'));
    if(btn) btn.classList.add('on');
    document.getElementById('schema-pre').textContent=SCHEMAS[type];
}

/* ══════════════════════════════
   P&L MODULE RENDERERS
══════════════════════════════ */

const fmtINR = v => {
  if(Math.abs(v)>=10000000) return '₹'+(v/10000000).toFixed(2)+'Cr';
  if(Math.abs(v)>=100000) return '₹'+(v/100000).toFixed(2)+'L';
  if(Math.abs(v)>=1000) return '₹'+(v/1000).toFixed(1)+'K';
  return '₹'+v.toLocaleString('en-IN');
};

function openPLEntryModal(id){
  const e = id ? getAllPL().find(x=>x.id===id) : null;
  document.getElementById('mpl-ttl').textContent = e ? 'Edit Entry' : 'Add P&L Entry';
  document.getElementById('mpl-id').value = e?.id||'';
  document.getElementById('mpl-type').value = e?.type||'Cost';
  document.getElementById('mpl-cat').value = e?.cat||'Labour';
  document.getElementById('mpl-desc').value = e?.desc||'';
  document.getElementById('mpl-period').value = e?.period||'';
  document.getElementById('mpl-status').value = e?.status||'Planned';
  document.getElementById('mpl-budget').value = e?.budget||0;
  document.getElementById('mpl-actual').value = e?.actual||0;
  document.getElementById('mpl-forecast').value = e?.forecast||0;
  document.getElementById('mpl-owner').value = e?.owner||'';
  document.getElementById('mpl-notes').value = e?.notes||'';
  openM('m-pl');
}

function renderPL(){
  const p = curProj();
  if(!p){
    ['pl-kpis','pl-tbody','pl-chart','pl-chart-lbls','pl-summary','pl-rev-breakdown','pl-cost-breakdown'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.innerHTML='<div class="empty" style="grid-column:1/-1"><h3>No project selected</h3></div>';
    }); return;
  }
  document.getElementById('pl-sub').textContent = `${p.name} · Financial Dashboard`;
  const typeF = document.getElementById('pl-filter-type')?.value||'';
  const catF = document.getElementById('pl-filter-cat')?.value||'';
  let entries = pPL(p.id);

  // totals
  const rev = entries.filter(e=>e.type==='Revenue');
  const cost = entries.filter(e=>e.type==='Cost');
  const totBudRev=rev.reduce((a,e)=>a+e.budget,0), totActRev=rev.reduce((a,e)=>a+e.actual,0), totFcstRev=rev.reduce((a,e)=>a+e.forecast,0);
  const totBudCost=cost.reduce((a,e)=>a+e.budget,0), totActCost=cost.reduce((a,e)=>a+e.actual,0), totFcstCost=cost.reduce((a,e)=>a+e.forecast,0);
  const grossBudProfit=totBudRev-totBudCost, grossActProfit=totActRev-totActCost, grossFcstProfit=totFcstRev-totFcstCost;
  const budMargin=totBudRev?Math.round(grossBudProfit/totBudRev*100):0;
  const actMargin=totActRev?Math.round(grossActProfit/totActRev*100):0;
  const budgetUsed=totBudCost?Math.round(totActCost/totBudCost*100):0;
  const revenueVar=totActRev-totBudRev, costVar=totActCost-totBudCost;

  // KPIs
  document.getElementById('pl-kpis').innerHTML = `
    <div class="kcard k2"><div class="kl">Total Revenue (Actual)</div><div class="kv" style="font-size:20px">${fmtINR(totActRev)}</div><div class="kd ${revenueVar>=0?'ku':'kdn'}">${revenueVar>=0?'↑':'↓'} vs Budget: ${fmtINR(Math.abs(revenueVar))}</div></div>
    <div class="kcard k4"><div class="kl">Total Cost (Actual)</div><div class="kv" style="font-size:20px">${fmtINR(totActCost)}</div><div class="kd ${costVar<=0?'ku':'kdn'}">${costVar>0?'↑ Over':'↓ Under'} by ${fmtINR(Math.abs(costVar))}</div></div>
    <div class="kcard k1"><div class="kl">Gross Profit (Actual)</div><div class="kv" style="font-size:20px;color:${grossActProfit>=0?'var(--green)':'var(--red)'}">${fmtINR(grossActProfit)}</div><div class="kd ${grossActProfit>=0?'ku':'kdn'}">${grossActProfit>=0?'Profitable':'Loss-making'}</div></div>
    <div class="kcard k3"><div class="kl">Net Margin (Actual)</div><div class="kv" style="font-size:20px;color:${actMargin>=0?'var(--green)':'var(--red)'}">${actMargin}%</div><div class="kd kfl">Budget target: ${budMargin}%</div></div>
    <div class="kcard k5"><div class="kl">Budget Utilization</div><div class="kv" style="font-size:20px;color:${budgetUsed>100?'var(--red)':budgetUsed>85?'var(--amber)':'var(--green)'}">${budgetUsed}%</div><div class="kd ${budgetUsed>100?'kdn':budgetUsed>85?'kfl':'ku'}">${budgetUsed>100?'Over budget':budgetUsed>85?'Watch carefully':'Healthy spend'}</div></div>
  `;

  // P&L Summary
  document.getElementById('pl-summary').innerHTML = `
    <div class="pl-section-row"><span class="pl-sec-lbl">Revenue (Budget)</span><span class="pl-sec-val">${fmtINR(totBudRev)}</span></div>
    <div class="pl-section-row"><span class="pl-sec-lbl">Revenue (Actual)</span><span class="pl-sec-val" style="color:var(--teal)">${fmtINR(totActRev)}</span></div>
    <div class="pl-section-row"><span class="pl-sec-lbl">Revenue (Forecast)</span><span class="pl-sec-val" style="color:var(--amber)">${fmtINR(totFcstRev)}</span></div>
    <div class="pl-divider"></div>
    <div class="pl-section-row"><span class="pl-sec-lbl">Cost (Budget)</span><span class="pl-sec-val">${fmtINR(totBudCost)}</span></div>
    <div class="pl-section-row"><span class="pl-sec-lbl">Cost (Actual)</span><span class="pl-sec-val" style="color:${totActCost>totBudCost?'var(--red)':'var(--teal)'}">${fmtINR(totActCost)}</span></div>
    <div class="pl-section-row"><span class="pl-sec-lbl">Cost (Forecast)</span><span class="pl-sec-val" style="color:var(--amber)">${fmtINR(totFcstCost)}</span></div>
    <div class="pl-divider"></div>
    <div class="pl-total-row" style="color:${grossActProfit>=0?'var(--green)':'var(--red)'}"><span>Net Profit (Actual)</span><span>${fmtINR(grossActProfit)}</span></div>
    <div class="pl-total-row" style="color:var(--amber);font-size:12px"><span>Net Profit (Forecast)</span><span>${fmtINR(grossFcstProfit)}</span></div>
    ${entries.length===0?'<div style="font-size:11px;color:var(--ink4);margin-top:8px;text-align:center">Add entries to see your P&L populate</div>':''}
  `;

  // Category breakdowns
  const cats = ['Labour','Infrastructure','Licensing','Services','Consulting','Sales','Other'];
  const catColors = {'Labour':'var(--rose)','Infrastructure':'var(--violet)','Licensing':'var(--teal)','Services':'var(--amber)','Consulting':'var(--blue,#1a4a8a)','Sales':'var(--green)','Other':'var(--ink4)'};

  function catBreakdown(type, containerId){
    const filtered = entries.filter(e=>e.type===type);
    const bycat = cats.map(c=>({ cat:c, budget:filtered.filter(e=>e.cat===c).reduce((a,e)=>a+e.budget,0), actual:filtered.filter(e=>e.cat===c).reduce((a,e)=>a+e.actual,0) })).filter(x=>x.budget||x.actual);
    const total = bycat.reduce((a,x)=>a+x.actual,0)||1;
    document.getElementById(containerId).innerHTML = bycat.length ? bycat.map(x=>{
      const pct=Math.round(x.actual/total*100);
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:700;margin-bottom:3px">
          <span style="color:var(--ink2)">${x.cat}</span>
          <span style="color:${catColors[x.cat]}">${fmtINR(x.actual)} <span style="color:var(--ink4);font-weight:400">(${pct}%)</span></span>
        </div>
        <div class="pgt"><div class="pgf" style="width:${pct}%;background:${catColors[x.cat]}"></div></div>
      </div>`;
    }).join('') : `<div class="empty" style="padding:10px"><h3>No ${type} entries</h3><p>Add entries to see breakdown</p></div>`;
  }
  catBreakdown('Revenue','pl-rev-breakdown');
  catBreakdown('Cost','pl-cost-breakdown');

  // Bar chart — by period
  const periods = [...new Set(entries.map(e=>e.period||'Unset'))].filter(Boolean);
  if(periods.length){
    const maxV = Math.max(...periods.map(pr=>{
      const ents = entries.filter(e=>(e.period||'Unset')===pr);
      return Math.max(ents.reduce((a,e)=>a+e.budget,0), ents.reduce((a,e)=>a+e.actual,0), ents.reduce((a,e)=>a+e.forecast,0));
    }), 1);
    document.getElementById('pl-chart').innerHTML = periods.map(pr=>{
      const ents = entries.filter(e=>(e.period||'Unset')===pr);
      const bud=ents.reduce((a,e)=>a+e.budget,0);
      const act=ents.reduce((a,e)=>a+e.actual,0);
      const fcs=ents.reduce((a,e)=>a+e.forecast,0);
      const h=(v)=>Math.max(4,Math.round(v/maxV*140));
      return `<div class="pl-bar-group">
        <div class="pl-bar-wrap">
          <div class="pl-bar" style="height:${h(bud)}px;width:16px;background:var(--violet);opacity:.7" data-tip="Budget: ${fmtINR(bud)}"></div>
          <div class="pl-bar" style="height:${h(act)}px;width:16px;background:var(--teal)" data-tip="Actual: ${fmtINR(act)}"></div>
          <div class="pl-bar" style="height:${h(fcs)}px;width:16px;background:var(--amber);opacity:.8" data-tip="Forecast: ${fmtINR(fcs)}"></div>
        </div>
      </div>`;
    }).join('');
    document.getElementById('pl-chart-lbls').innerHTML = periods.map(pr=>`<div class="pl-lbl" style="flex:1;min-width:48px">${pr}</div>`).join('');
  } else {
    document.getElementById('pl-chart').innerHTML='<div class="empty" style="width:100%;justify-content:center"><p style="font-size:12px;color:var(--ink4)">Set a period on entries to see the chart</p></div>';
    document.getElementById('pl-chart-lbls').innerHTML='';
  }

  // Filter + table
  let filtered = entries;
  if(typeF) filtered=filtered.filter(e=>e.type===typeF);
  if(catF) filtered=filtered.filter(e=>e.cat===catF);
  const statTag={'Planned':'tink','Committed':'tvio','Actual':'tgrn','Overrun':'tred'};
  document.getElementById('pl-tbody').innerHTML = filtered.length ? filtered.map(e=>{
    const varAmt = e.actual - e.budget;
    const varClass = varAmt > 0 && e.type==='Cost' ? 'pl-var-neg' : varAmt < 0 && e.type==='Revenue' ? 'pl-var-neg' : varAmt !== 0 ? 'pl-var-pos' : '';
    const varSign = varAmt>0?'+':'';
    return `<tr>
      <td><span class="tag ${e.type==='Revenue'?'tgrn':'tred'}">${e.type}</span><br/><span style="font-size:10px;color:var(--ink4)">${e.cat}</span></td>
      <td><div class="tn" style="font-size:12px">${e.desc}</div><div class="ts">${e.owner||'—'}</div></td>
      <td><span class="tag ${e.type==='Revenue'?'tgrn':'tred'}" style="font-size:9px">${e.type}</span></td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--ink4)">${e.period||'—'}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px">${fmtINR(e.budget)}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700">${fmtINR(e.actual)}</td>
      <td style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--amber)">${fmtINR(e.forecast)}</td>
      <td class="${varClass}" style="font-family:'JetBrains Mono',monospace;font-size:11px">${varSign}${fmtINR(varAmt)}</td>
      <td><span class="tag ${statTag[e.status]||'tink'}">${e.status}</span></td>
      <td><div style="display:flex;gap:3px">
        <button class="btn btn-ghost btn-xs" onclick="openPLEntryModal('${e.id}')">Edit</button>
        <button class="btn btn-danger btn-xs" onclick="delPLEntry('${e.id}')">Del</button>
      </div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="10" style="text-align:center;padding:24px;color:var(--ink4)">No entries yet. <a href="#" onclick="openPLEntryModal()" style="color:var(--rose)">Add your first P&L entry →</a></td></tr>`;
}

/* ══════════════════════════════
   EVENT LISTENERS (SAFE INITIALIZATION)
══════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    // 1. Setup Sidebar Navigation Clicks
    document.querySelectorAll('.ni').forEach(ni => {
        ni.addEventListener('click', () => nav(ni.dataset.tab, ni.dataset.agent));
    });

    // 2. Setup Modal Close on Background Click
    document.querySelectorAll('.mbg').forEach(bg => {
        bg.addEventListener('click', function(e){ 
            if(e.target === this) this.classList.remove('open'); 
        });
    });

    // 3. Setup Initial Schema View
    showSchema('json', document.querySelector('.stab.on'));

    // 4. Setup Task Progress Slider Live Feedback
    const progSlider = document.getElementById('mt-prog');
    if (progSlider) {
        progSlider.addEventListener('input', function() {
            const pVal = document.getElementById('mt-pv');
            const pVal2 = document.getElementById('mt-pv2');
            if(pVal) pVal.textContent = this.value + '%';
            if(pVal2) pVal2.textContent = this.value + '%';
        });
    }
});