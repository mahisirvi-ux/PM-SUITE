/* ══════════════════════════════
   APP STATE (MEMORY)
══════════════════════════════ */

// 1. Core Database Memory
let state = { 
    projects: [], 
    tasks: [], 
    risks: [], 
    resources: [], 
    milestones: [],
    pl: []
};

// 2. Currently Selected Project ID
let curPid = localStorage.getItem('curPid') || null;

// 3. AI Chat Memory (THIS IS WHAT WAS MISSING!)
let curAgent = 'planner';
let hist = { 
    planner: [], 
    risk: [], 
    resource: [], 
    delivery: [],
    finance: []
};

// 4. Global Getters
const getProjects = () => state.projects;
const getAllTasks = () => state.tasks;
const getAllRisks = () => state.risks;
const getAllRes = () => state.resources;
const getAllMs = () => state.milestones;
const getAllPL = () => state.pl;

// 5. Filtered Getters
const pTasks = pid => state.tasks.filter(t => t.pid === pid);
const pRisks = pid => state.risks.filter(r => r.pid === pid);
const pRes = pid => state.resources.filter(r => r.pid === pid);
const pMs = pid => state.milestones.filter(m => m.pid === pid);
const curProj = () => state.projects.find(p => p.id === curPid) || null;
const pPL = pid => state.pl.filter(e => e.pid === pid);