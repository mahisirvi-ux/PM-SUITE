
function setAgent(id, btn){
  curAgent=id; const a=AGENTS[id];
  document.getElementById('a-title').textContent=a.title; document.getElementById('a-desc').textContent=a.desc; document.getElementById('a-av').style.background=a.grad;
  document.querySelectorAll('.atab').forEach(b=>b.classList.remove('on'));
  if(btn) btn.classList.add('on');
  document.getElementById('chips').innerHTML=a.chips.map(c=>`<div class="chip" onclick="sendChip('${c}')">${c}</div>`).join('');
  const el=document.getElementById('msgs'); el.innerHTML='';
  if(!hist[id].length) appendMsg('bot',`Hi! I'm the **${a.title}**. I can see your live project data. ${a.desc}. What would you like to know?`);
  else hist[id].forEach(m=>rawMsg(m.r,m.c));
}
function rawMsg(role,content){
  const el=document.getElementById('msgs');
  const d=document.createElement('div'); d.className=`cm ${role==='bot'?'':'u'}`;
  const av=document.createElement('div'); av.className=`cav ${role==='bot'?'b':'u'}`;
  if(role==='bot') av.innerHTML=`<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
  else av.textContent='PM';
  const bub=document.createElement('div'); bub.className='cbub';
  if(role==='bot') bub.innerHTML=fmt(content); else bub.textContent=content;
  d.appendChild(av); d.appendChild(bub); el.appendChild(d); el.scrollTop=el.scrollHeight;
}
function appendMsg(role,content){ rawMsg(role,content); hist[curAgent].push({r:role,c:content}); }
function fmt(t){ return t.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>').replace(/^[-•] (.+)$/gm,'<li>$1</li>').replace(/(<li>[\s\S]*?<\/li>)/g,'<ul>$1</ul>').split('\n\n').map(p=>p.trim()?`<p>${p}</p>`:'').join(''); }
function showTyp(){ const el=document.getElementById('msgs'); const d=document.createElement('div'); d.className='cm';d.id='typ'; const av=document.createElement('div');av.className='cav b';av.innerHTML=`<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`; const b=document.createElement('div');b.className='cbub tydots';b.innerHTML='<div class="td"></div><div class="td"></div><div class="td"></div>'; d.appendChild(av);d.appendChild(b);el.appendChild(d);el.scrollTop=el.scrollHeight; }
function hideTyp(){ const e=document.getElementById('typ'); if(e) e.remove(); }
function sendMsg(){ const ta=document.getElementById('cta'); const t=ta.value.trim(); if(!t)return; appendMsg('user',t); ta.value=''; ta.style.height='auto'; callAI(t); }
function sendChip(t){ appendMsg('user',t); callAI(t); }
function chatAsk(agent, msg){ nav('chat'); setAgent(agent, document.querySelector(`.atab[onclick*="${agent}"]`)); setTimeout(()=>{ appendMsg('user',msg); callAI(msg); },100); }
document.getElementById('cta').addEventListener('keydown', e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMsg(); }});
document.getElementById('cta').addEventListener('input',function(){ this.style.height='auto'; this.style.height=Math.min(this.scrollHeight,80)+'px'; });

function refreshChatSide(p){
  if(!p){ document.getElementById('cs-proj').innerHTML='<div style="font-size:12px;color:var(--ink4)">No project selected.</div>'; document.getElementById('cs-block').innerHTML=''; document.getElementById('cs-team').innerHTML=''; return; }
  const tasks=pTasks(p.id), res=pRes(p.id);
  document.getElementById('cs-proj').innerHTML=[['Name',p.name],['Status',p.status||'—'],['Sprint',`${p.sprint}/${p.sprints}`],['End Date',p.end||'TBD'],['Tasks',`${tasks.filter(t=>t.status==='Done').length}/${tasks.length} done`],['Risks',pRisks(p.id).filter(r=>r.status==='Open').length+' open']].map(([l,v])=>`<div class="csrow"><span class="csl">${l}</span><span class="csv">${v}</span></div>`).join('');
  const bl=tasks.filter(t=>t.status==='Blocked');
  document.getElementById('cs-block').innerHTML=bl.length?bl.slice(0,3).map(t=>`<div style="padding:7px 10px;background:var(--redd);border-radius:7px;border-left:3px solid var(--red)"><div style="font-size:12px;font-weight:700;color:var(--red)">${t.name}</div><div style="font-size:10px;color:var(--ink4)">${t.ticket||''} · ${t.sp||0} SP</div></div>`).join(''):'<div style="font-size:12px;color:var(--green);font-weight:600">✓ No blockers</div>';
  document.getElementById('cs-team').innerHTML=res.slice(0,5).map(m=>`<div style="display:flex;align-items:center;gap:6px;font-size:12px;padding:3px 0"><div style="width:20px;height:20px;border-radius:6px;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff;flex-shrink:0">${m.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div><span style="font-weight:600;color:var(--ink2)">${m.name}</span><span style="margin-left:auto;font-size:10px;color:${uc(m.util)};font-weight:700">${m.util}%</span></div>`).join('')||'<div style="font-size:12px;color:var(--ink4)">No team added.</div>';
}