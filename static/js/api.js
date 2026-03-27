/* ══════════════════════════════
   BACKEND API ENGINE
══════════════════════════════ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

async function loadInitialData() {
  try {
    const res = await fetch(`${API_BASE}/projects`);
    state.projects = await res.json();
    
    if (curPid && !state.projects.find(p => p.id === curPid)) curPid = null;
    if (!curPid && state.projects.length) curPid = state.projects[0].id;
    
    if (curPid) {
      localStorage.setItem('curPid', curPid);
      await loadProjectData(curPid);
    }
    
    buildProjPicker();
    refresh();
  } catch (e) {
    console.error(e);
    toast('Database offline. Start FastAPI server.', 'err');
  }
}
/* ══════════════════════════════
   DATA LOADING
══════════════════════════════ */


async function loadProjectData(pid) {
  try {
    const [t, r, res, m] = await Promise.all([
      fetch(`${API_BASE}/tasks/${pid}`).then(x => x.json()),
      fetch(`${API_BASE}/risks/${pid}`).then(x => x.json()),
      fetch(`${API_BASE}/resources/${pid}`).then(x => x.json()),
      fetch(`${API_BASE}/milestones/${pid}`).then(x => x.json())
    ]);
    state.tasks = t; state.risks = r; state.resources = res; state.milestones = m;
  } catch (e) {
    toast('Error loading project data', 'err');
  }
}

async function switchProj(id) {
  curPid = id;
  localStorage.setItem('curPid', id);
  await loadProjectData(id);
  refresh();
}
/* ══════════════════════════════
   IMPORT / EXPORT LOGIC
══════════════════════════════ */
async function uploadFile(file) {
    if(!file) return;

    // 1. Get the import type
    const impTypeEl = document.getElementById('import-type');
    const impType = impTypeEl ? impTypeEl.value : 'tasks';

    // 2. Block task uploads if no project is selected
    if(impType === 'tasks' && !curPid && file.name.endsWith('.csv')) {
        toast("Please select a project first to import tasks.", "err");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("import_type", impType); 
    if (curPid) formData.append("pid", curPid);

    try {
        // UI Feedback
        document.getElementById('uprog').style.display = 'block';
        document.getElementById('uprog-name').textContent = file.name;
        document.getElementById('uprog-fill').style.width = '60%';
        document.getElementById('ustatus').textContent = "Uploading to Database...";
        
        const res = await fetch(`${API_BASE}/import`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        document.getElementById('uprog-fill').style.width = '100%';
        
        if (res.ok) {
            document.getElementById('ustatus').textContent = "Success!";
            toast(data.message || "Import successful!");
            await loadInitialData(); // Reload UI with fresh DB data
        } else {
            document.getElementById('ustatus').textContent = "Failed.";
            // Handle FastAPI validation errors (which come back as arrays)
            let errMsg = data.detail || "Import failed";
            if (Array.isArray(data.detail)) errMsg = "Backend rejected the format. Check terminal for details.";
            toast(errMsg, "err");
        }
    } catch(e) {
        toast("Network error. Is your FastAPI server running?", "err");
    } finally {
        setTimeout(() => { 
            document.getElementById('uprog').style.display = 'none'; 
            document.getElementById('ustatus').textContent = "";
        }, 3000);
    }
}
async function saveProj(){
  const name = document.getElementById('mp-name').value.trim();
  if(!name){ toast('Project name is required','err'); return; }
  const id = document.getElementById('mp-id').value || uid();
  const proj = {
    id, name, desc: document.getElementById('mp-desc').value,
    start: document.getElementById('mp-start').value, end: document.getElementById('mp-end').value,
    sprint: parseInt(document.getElementById('mp-sprint').value) || 1, sprints: parseInt(document.getElementById('mp-sprints').value) || 12,
    status: document.getElementById('mp-status').value, updatedAt: Date.now()
  };
  await fetch(`${API_BASE}/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proj) });
  curPid = id; localStorage.setItem('curPid', id);
  await loadInitialData(); 
  closeM('m-proj'); toast('Project saved ✓');
}
async function saveTask(){
  if(!curPid){ toast('Select a project first','err'); return; }
  const name = document.getElementById('mt-name').value.trim();
  if(!name){ toast('Task name is required','err'); return; }
  const task = {
    id: document.getElementById('mt-id').value || uid(), pid: curPid, name,
    ticket: document.getElementById('mt-ticket').value, comp: document.getElementById('mt-comp').value,
    assignee: document.getElementById('mt-assignee').value, sprint: +document.getElementById('mt-sprint').value || 1,
    sp: +document.getElementById('mt-sp').value || 0, prio: document.getElementById('mt-prio').value,
    status: document.getElementById('mt-stat').value, prog: +document.getElementById('mt-prog').value || 0,
    start: document.getElementById('mt-start').value, end: document.getElementById('mt-end').value,
    notes: document.getElementById('mt-notes').value, updatedAt: Date.now()
  };
  await fetch(`${API_BASE}/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
  await loadProjectData(curPid); closeM('m-task'); refresh(); toast('Task saved ✓');
}
async function delTask(id){ 
  if(!confirm('Delete this task?')) return; 
  await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
  await loadProjectData(curPid); refresh(); toast('Task deleted'); 
}
async function saveRisk(){
  if(!curPid){ toast('Select a project first','err'); return; }
  const title = document.getElementById('mr-title').value.trim();
  if(!title){ toast('Risk title required','err'); return; }
  const risk = {
    id: document.getElementById('mr-id').value || uid(), pid:curPid, title, desc:document.getElementById('mr-desc').value,
    sev:document.getElementById('mr-sev').value, cat:document.getElementById('mr-cat').value, prob:document.getElementById('mr-prob').value,
    imp:document.getElementById('mr-imp').value, owner:document.getElementById('mr-owner').value, status:document.getElementById('mr-stat').value,
    mit:document.getElementById('mr-mit').value, updatedAt:Date.now()
  };
  await fetch(`${API_BASE}/risks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(risk) });
  await loadProjectData(curPid); closeM('m-risk'); refresh(); toast('Risk saved ✓');
}
async function delRisk(id){ 
  if(!confirm('Delete this risk?')) return; 
  await fetch(`${API_BASE}/risks/${id}`, { method: 'DELETE' });
  await loadProjectData(curPid); refresh(); toast('Risk deleted'); 
}
async function saveRes(){
  if(!curPid){ toast('Select a project first','err'); return; }
  const name = document.getElementById('mres-name').value.trim();
  if(!name){ toast('Name required','err'); return; }
  const res = {
    id: document.getElementById('mres-id').value || uid(), pid:curPid, name, role:document.getElementById('mres-role').value,
    util:+document.getElementById('mres-util').value||80, cap:+document.getElementById('mres-cap').value||40,
    skills:document.getElementById('mres-skills').value.split(',').map(s=>s.trim()).filter(Boolean),
    color:document.getElementById('mres-color').value, updatedAt:Date.now()
  };
  await fetch(`${API_BASE}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(res) });
  await loadProjectData(curPid); closeM('m-res'); refresh(); toast('Member saved ✓');
}

async function delRes(id){ 
  if(!confirm('Remove this member?')) return; 
  await fetch(`${API_BASE}/resources/${id}`, { method: 'DELETE' });
  await loadProjectData(curPid); refresh(); toast('Member removed'); 
}
async function saveMs(){
  if(!curPid){ toast('Select a project first','err'); return; }
  const title = document.getElementById('mms-title').value.trim();
  if(!title){ toast('Title required','err'); return; }
  const ms = {
    id: document.getElementById('mms-id').value || uid(), pid:curPid, title, date:document.getElementById('mms-date').value,
    status:document.getElementById('mms-stat').value, tasks:document.getElementById('mms-tasks').value.split('\n').map(s=>s.trim()).filter(Boolean),
    updatedAt:Date.now()
  };
  await fetch(`${API_BASE}/milestones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ms) });
  await loadProjectData(curPid); closeM('m-ms'); refresh(); toast('Milestone saved ✓');
}

async function delMs(id){ 
  if(!confirm('Delete milestone?')) return; 
  await fetch(`${API_BASE}/milestones/${id}`, { method: 'DELETE' });
  await loadProjectData(curPid); refresh(); toast('Milestone deleted'); 
}
/* ══════════════════════════════
   IMPORT / SEED
══════════════════════════════ */
async function seedData(){
  if(!confirm('Load sample FinTech Core Platform v3.0 project?')) return;
  const pid='bn_sample_fintech_v3';
  const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().split('T')[0];};
  
  await fetch(`${API_BASE}/projects`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id:pid,name:'FinTech Core Platform v3.0',desc:'Next-gen core banking platform',start:'2026-01-06',end:'2026-06-30',sprint:7,sprints:12,status:'On Track',updatedAt:Date.now()})});
  
  const tasks=[
    {id:'ts01',pid,name:'Payment Gateway Integration',ticket:'BE-1042',comp:'payments-service',assignee:'Arjun M.',sprint:7,sp:13,prio:'Critical',status:'In Progress',prog:75,start:d(-28),end:d(10),updatedAt:Date.now()},
    {id:'ts02',pid,name:'Auth Service Refactor',ticket:'BE-1038',comp:'auth-service',assignee:'Shreya I.',sprint:7,sp:8,prio:'High',status:'Done',prog:100,start:d(-42),end:d(-5),updatedAt:Date.now()},
    {id:'ts04',pid,name:'DB Schema Migration v3',ticket:'DB-0089',comp:'infra',assignee:'Sanjay P.',sprint:7,sp:21,prio:'Critical',status:'Blocked',prog:30,start:d(-30),end:d(5),updatedAt:Date.now()}
  ];
  for(let t of tasks) await fetch(`${API_BASE}/tasks`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(t)});
  
  const res=[
    {id:'re01',pid,name:'Arjun Mehta',role:'Backend Lead',util:92,cap:40,skills:['Node.js','Go','PostgreSQL'],color:'linear-gradient(135deg,#ff2d6b,#ff6b9d)',updatedAt:Date.now()},
    {id:'re05',pid,name:'Sanjay P.',role:'DBA / Infra',util:100,cap:40,skills:['PostgreSQL','MongoDB'],color:'linear-gradient(135deg,#d97706,#f59e0b)',updatedAt:Date.now()}
  ];
  for(let r of res) await fetch(`${API_BASE}/resources`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(r)});

  curPid=pid; localStorage.setItem('curPid',pid);
  await loadInitialData(); toast('Sample project seeded ✓');
}
async function callAI(msg){
  const ctx = buildCtx();
  const msgs = hist[curAgent].slice(0,-1).map(m => ({role: m.r === 'bot' ? 'assistant' : 'user', content: m.c}));
  
  showTyp();
  try {
    // We are now pointing to YOUR local FastAPI server!
    const r = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: curAgent,
        message: msg,
        context: ctx,
        history: msgs
      })
    });
    
    const d = await r.json();
    hideTyp(); 
    appendMsg('bot', d.reply || 'Error — please try again.');
    
  } catch(e) {
    hideTyp(); 
    appendMsg('bot', 'Connection error. Make sure your FastAPI server is running!'); 
    console.error(e);
  }
}