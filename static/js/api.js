/* ══════════════════════════════
   MASTER API WRAPPER (SECURITY)
══════════════════════════════ */
async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('pm_token');
    
    // Preserve any custom headers (like Content-Type), but add the VIP Token
    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Make the secure request
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    // Global Security Check: If the token is fake or expired, kick them out
    if (response.status === 401) {
        console.warn("Token expired or missing. Triggering login...");
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'flex';
        localStorage.removeItem('pm_token');
        throw new Error("Unauthorized");
    }

    return response;
}

/* ══════════════════════════════
   BACKEND API ENGINE
══════════════════════════════ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

async function loadInitialData() {
  try {
    const res = await apiFetch(`/projects`); // Using secure wrapper!
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
    const [t, r, res, m, pl] = await Promise.all([
      apiFetch(`/tasks/${pid}`).then(x => x.json()),
      apiFetch(`/risks/${pid}`).then(x => x.json()),
      apiFetch(`/resources/${pid}`).then(x => x.json()),
      apiFetch(`/milestones/${pid}`).then(x => x.json()),
      apiFetch(`/pl/${pid}`).then(x => x.json())
    ]);
    state.tasks = t; state.risks = r; state.resources = res; state.milestones = m; state.pl = pl;
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

    const impTypeEl = document.getElementById('import-type');
    const impType = impTypeEl ? impTypeEl.value : 'tasks';

    if(impType === 'tasks' && !curPid && file.name.endsWith('.csv')) {
        toast("Please select a project first to import tasks.", "err");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("import_type", impType); 
    if (curPid) formData.append("pid", curPid);

    try {
        document.getElementById('uprog').style.display = 'block';
        document.getElementById('uprog-name').textContent = file.name;
        document.getElementById('uprog-fill').style.width = '60%';
        document.getElementById('ustatus').textContent = "Uploading to Database...";
        
        const res = await apiFetch(`/import`, {
            method: 'POST',
            body: formData
        });
        
        const data = await res.json();
        document.getElementById('uprog-fill').style.width = '100%';
        
        if (res.ok) {
            document.getElementById('ustatus').textContent = "Success!";
            toast(data.message || "Import successful!");
            await loadInitialData(); 
        } else {
            document.getElementById('ustatus').textContent = "Failed.";
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

/* ══════════════════════════════
   CRUD OPERATIONS
══════════════════════════════ */
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
  await apiFetch(`/projects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(proj) });
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
  await apiFetch(`/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(task) });
  await loadProjectData(curPid); closeM('m-task'); refresh(); toast('Task saved ✓');
}

async function delTask(id){ 
  if(!confirm('Delete this task?')) return; 
  await apiFetch(`/tasks/${id}`, { method: 'DELETE' });
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
  await apiFetch(`/risks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(risk) });
  await loadProjectData(curPid); closeM('m-risk'); refresh(); toast('Risk saved ✓');
}

async function delRisk(id){ 
  if(!confirm('Delete this risk?')) return; 
  await apiFetch(`/risks/${id}`, { method: 'DELETE' });
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
  await apiFetch(`/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(res) });
  await loadProjectData(curPid); closeM('m-res'); refresh(); toast('Member saved ✓');
}

async function delRes(id){ 
  if(!confirm('Remove this member?')) return; 
  await apiFetch(`/resources/${id}`, { method: 'DELETE' });
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
  await apiFetch(`/milestones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ms) });
  await loadProjectData(curPid); closeM('m-ms'); refresh(); toast('Milestone saved ✓');
}

async function delMs(id){ 
  if(!confirm('Delete milestone?')) return; 
  await apiFetch(`/milestones/${id}`, { method: 'DELETE' });
  await loadProjectData(curPid); refresh(); toast('Milestone deleted'); 
}

async function savePLEntry(){
    if(!curPid){ toast('Select a project first','err'); return; }
    const desc = document.getElementById('mpl-desc').value.trim();
    if(!desc){ toast('Description required','err'); return; }
    
    const entry = {
        id: document.getElementById('mpl-id').value || uid(), pid:curPid,
        type: document.getElementById('mpl-type').value, cat: document.getElementById('mpl-cat').value,
        desc, period: document.getElementById('mpl-period').value, status: document.getElementById('mpl-status').value,
        budget: parseFloat(document.getElementById('mpl-budget').value)||0,
        actual: parseFloat(document.getElementById('mpl-actual').value)||0,
        forecast: parseFloat(document.getElementById('mpl-forecast').value)||0,
        owner: document.getElementById('mpl-owner').value, notes: document.getElementById('mpl-notes').value,
        updatedAt: Date.now()
    };
    
    await apiFetch(`/pl`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
    await loadProjectData(curPid); closeM('m-pl'); refresh(); toast('P&L Entry saved ✓');
}

async function delPLEntry(id){ 
    if(!confirm('Delete this P&L entry?')) return; 
    await apiFetch(`/pl/${id}`, { method: 'DELETE' });
    await loadProjectData(curPid); refresh(); toast('Entry deleted'); 
}

/* ══════════════════════════════
   IMPORT / SEED & AI
══════════════════════════════ */
async function seedData(){
  if(!confirm('Load sample FinTech Core Platform v3.0 project?')) return;
  const pid='bn_sample_fintech_v3';
  const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().split('T')[0];};
  
  await apiFetch(`/projects`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id:pid,name:'FinTech Core Platform v3.0',desc:'Next-gen core banking platform',start:'2026-01-06',end:'2026-06-30',sprint:7,sprints:12,status:'On Track',updatedAt:Date.now()})});
  
  const tasks=[
    {id:'ts01',pid,name:'Payment Gateway Integration',ticket:'BE-1042',comp:'payments-service',assignee:'Arjun M.',sprint:7,sp:13,prio:'Critical',status:'In Progress',prog:75,start:d(-28),end:d(10),updatedAt:Date.now()},
    {id:'ts02',pid,name:'Auth Service Refactor',ticket:'BE-1038',comp:'auth-service',assignee:'Shreya I.',sprint:7,sp:8,prio:'High',status:'Done',prog:100,start:d(-42),end:d(-5),updatedAt:Date.now()},
    {id:'ts04',pid,name:'DB Schema Migration v3',ticket:'DB-0089',comp:'infra',assignee:'Sanjay P.',sprint:7,sp:21,prio:'Critical',status:'Blocked',prog:30,start:d(-30),end:d(5),updatedAt:Date.now()}
  ];
  for(let t of tasks) await apiFetch(`/tasks`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(t)});
  
  const res=[
    {id:'re01',pid,name:'Arjun Mehta',role:'Backend Lead',util:92,cap:40,skills:['Node.js','Go','PostgreSQL'],color:'linear-gradient(135deg,#ff2d6b,#ff6b9d)',updatedAt:Date.now()},
    {id:'re05',pid,name:'Sanjay P.',role:'DBA / Infra',util:100,cap:40,skills:['PostgreSQL','MongoDB'],color:'linear-gradient(135deg,#d97706,#f59e0b)',updatedAt:Date.now()}
  ];
  for(let r of res) await apiFetch(`/resources`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(r)});

  curPid=pid; localStorage.setItem('curPid',pid);
  await loadInitialData(); toast('Sample project seeded ✓');
}

async function callAI(msg){
  const ctx = buildCtx();
  const msgs = hist[curAgent].slice(0,-1).map(m => ({role: m.r === 'bot' ? 'assistant' : 'user', content: m.c}));
  
  showTyp();
  try {
    const r = await apiFetch(`/chat`, {
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

/* ══════════════════════════════
   AUTHENTICATION LOGIC
══════════════════════════════ */
let isSignup = false;

function toggleAuthMode() {
    isSignup = !isSignup;
    document.getElementById('auth-title').innerText = isSignup ? 'Create Account' : 'Welcome Back';
    document.getElementById('auth-subtitle').innerText = isSignup ? 'Sign up to start managing projects.' : 'Log in to access your projects.';
    document.getElementById('auth-name-group').style.display = isSignup ? 'block' : 'none';
    document.getElementById('auth-submit').innerText = isSignup ? 'Sign Up' : 'Log In';
    document.getElementById('auth-switch-text').innerText = isSignup ? 'Already have an account?' : "Don't have an account?";
    document.querySelector('#auth-switch-text + a').innerText = isSignup ? 'Log in' : 'Sign up';
    document.getElementById('auth-error').style.display = 'none';
}

async function handleAuth() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const name = document.getElementById('auth-name').value;
    const errorEl = document.getElementById('auth-error');
    
    errorEl.style.display = 'none';

    // We do NOT use apiFetch here because we don't have a token yet!
    const endpoint = isSignup ? '/auth/signup' : '/auth/login';
    const payload = isSignup ? { email, password, name } : { email, password };

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Authentication failed');
        }

        // 🌟 SUCCESS! Save the token
        localStorage.setItem('pm_token', data.access_token);
        
        document.getElementById('auth-overlay').style.display = 'none';
        
        // Boot up the application data now that we are logged in!
        populateUserProfile();
        await loadInitialData(); 
        
    } catch (err) {
        errorEl.innerText = err.message;
        errorEl.style.display = 'block';
    }
}

// ==========================================
// LOGOUT FUNCTION (Must be in global scope!)
// ==========================================
function performLogout() {
    console.log("Logout triggered!"); // Helps us debug
    
    // 1. Throw away the VIP wristband
    localStorage.removeItem('pm_token');
    
    // 2. Clear any saved UI preferences
    localStorage.removeItem('curPid');
    
    // 3. Force the browser to refresh and clear memory
    window.location.reload();
}
 

/* ══════════════════════════════
   APP STARTUP CHECK
══════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('pm_token');
    const authOverlay = document.getElementById('auth-overlay');
    
    if (token) {
        // Already logged in! Hide overlay and boot app.
        if (authOverlay) authOverlay.style.display = 'none';
        populateUserProfile();
        loadInitialData(); 
    } else {
        // Force login screen
        if (authOverlay) authOverlay.style.display = 'flex';
    }
});

// ==========================================
// USER PROFILE PANEL LOGIC
// ==========================================

// 1. Toggles the dropdown open and closed
function toggleUserMenu() {
    const menu = document.getElementById('user-menu');
    menu.style.display = menu.style.display === 'none' || menu.style.display === '' ? 'block' : 'none';
}

// 2. Closes the dropdown if the user clicks anywhere else on the screen
document.addEventListener('click', (e) => {
    const menu = document.getElementById('user-menu');
    const btn = document.getElementById('user-profile-btn');
    if(menu && menu.style.display === 'block') {
        if(!menu.contains(e.target) && !btn.contains(e.target)){
            menu.style.display = 'none';
        }
    }
});

// 3. Decodes the JWT token to extract the user's email and role
function populateUserProfile() {
    const token = localStorage.getItem('pm_token');
    if(!token) return;
    
    try {
        // A JWT is 3 parts separated by dots. The middle part is the data payload!
        // atob() decodes the base64 string into a readable JSON format.
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join('')));

        // Update the panel with the decoded data
        if(payload.sub) {
            document.getElementById('um-email').textContent = payload.sub;
            // Use the first part of the email as their display name on the button
            document.getElementById('top-user-name').textContent = payload.sub.split('@')[0];
        }
        if(payload.role) {
            document.getElementById('um-role').textContent = payload.role;
        }
    } catch(e) {
        console.error("Could not parse JWT token for user profile.");
    }
}