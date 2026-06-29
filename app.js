/* ===================== ÉTAT & PERSISTANCE ===================== */
const LS_CONFIG = 'badm_zone_config_v1';
const LS_RECORDS = 'badm_zone_records_v1';

let config = {
  rows: 2,
  cols: 2,
  maxAttempts: null, // null = illimité, sinon nombre entier
  zoneBonus: {1:0, 2:0, 3:0, 4:0},
  students: [],   // {id, name, group}
  groups: [],     // string[]
  specialConditions: [
    {id:'c1', name:'Faute', points:0},
    {id:'c2', name:'Sortie de terrain', points:0}
  ] // {id, name, points} — boutons additionnels (fautes, sorties...)
};

let records = []; // {studentId, zone, bonus, ts}

function loadAll(){
  try{
    const c = JSON.parse(localStorage.getItem(LS_CONFIG));
    if(c) config = c;
  }catch(e){}
  try{
    const r = JSON.parse(localStorage.getItem(LS_RECORDS));
    if(Array.isArray(r)) records = r;
  }catch(e){}
  if(!Array.isArray(config.specialConditions)){
    config.specialConditions = [
      {id:'c1', name:'Faute', points:0},
      {id:'c2', name:'Sortie de terrain', points:0}
    ];
  }
}
function saveConfig(){ localStorage.setItem(LS_CONFIG, JSON.stringify(config)); }
function saveRecords(){ localStorage.setItem(LS_RECORDS, JSON.stringify(records)); }

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 1800);
}

function uid(){ return 'e'+Math.random().toString(36).slice(2,9); }

/* ===================== ONGLETS ===================== */
document.getElementById('tabs').addEventListener('click', e=>{
  const btn = e.target.closest('button[data-tab]');
  if(!btn) return;
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  ['config','observation','stats'].forEach(name=>{
    document.getElementById('tab-'+name).classList.toggle('hidden', name !== btn.dataset.tab);
  });
  if(btn.dataset.tab === 'observation') refreshObservation();
  if(btn.dataset.tab === 'stats') refreshStats();
});

/* ===================== CONFIGURATION : TERRAIN ===================== */
function zoneCount(){ return config.rows * config.cols; }

function buildCourtGrid(container, withClicks, withCounts, studentRecords, disabled){
  container.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${config.rows}, 1fr)`;
  container.innerHTML = '';
  for(let z=1; z<=zoneCount(); z++){
    const div = document.createElement('div');
    div.className = 'zone';
    div.dataset.zone = z;
    const bonus = config.zoneBonus[z] || 0;

    const numSpan = document.createElement('span');
    numSpan.textContent = z;
    div.appendChild(numSpan);

    if(bonus > 0){
      const b = document.createElement('span');
      b.className = 'bonus-badge';
      b.textContent = '+' + bonus;
      div.appendChild(b);
    }
    if(withCounts){
      const c = document.createElement('span');
      c.className = 'count';
      const n = studentRecords.filter(r=>r.zone===z).length;
      c.textContent = n + ' tir' + (n===1?'':'s');
      div.appendChild(c);
    }
    if(withClicks){
      if(disabled){
        div.style.opacity = '.4';
        div.style.cursor = 'not-allowed';
      }else{
        div.addEventListener('click', ()=> onZoneClick(z, div));
      }
    }
    container.appendChild(div);
  }
}

function rebuildBonusTable(){
  const tbody = document.querySelector('#bonusTable tbody');
  tbody.innerHTML = '';
  for(let z=1; z<=zoneCount(); z++){
    if(!(z in config.zoneBonus)) config.zoneBonus[z] = 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>Zone ${z}</td><td><input type="number" min="0" step="1" value="${config.zoneBonus[z]}" data-zone="${z}" class="bonusInput"></td>`;
    tbody.appendChild(tr);
  }
  // remove obsolete zone keys
  Object.keys(config.zoneBonus).forEach(k=>{ if(+k > zoneCount()) delete config.zoneBonus[k]; });

  tbody.querySelectorAll('.bonusInput').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      config.zoneBonus[inp.dataset.zone] = parseInt(inp.value || '0', 10);
      buildCourtGrid(document.getElementById('previewCourt'), false, false, []);
    });
  });
}

function refreshTerrainUI(){
  buildCourtGrid(document.getElementById('previewCourt'), false, false, []);
  rebuildBonusTable();
}

function rebuildSpecialTable(){
  const tbody = document.getElementById('specialBody');
  tbody.innerHTML = '';
  config.specialConditions.forEach(cond=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" value="${cond.name}" data-id="${cond.id}" class="specName"></td>
      <td><input type="number" step="1" value="${cond.points}" data-id="${cond.id}" class="specPoints"></td>
      <td><button class="btn btn-danger specDel" data-id="${cond.id}" style="padding:5px 10px;">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.specName').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const cond = config.specialConditions.find(c=>c.id===inp.dataset.id);
      if(cond) cond.name = inp.value;
      renderSpecialButtons();
    });
  });
  tbody.querySelectorAll('.specPoints').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const cond = config.specialConditions.find(c=>c.id===inp.dataset.id);
      if(cond) cond.points = parseInt(inp.value || '0', 10);
      renderSpecialButtons();
    });
  });
  tbody.querySelectorAll('.specDel').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      config.specialConditions = config.specialConditions.filter(c=>c.id!==btn.dataset.id);
      rebuildSpecialTable();
      renderSpecialButtons();
    });
  });
}

document.getElementById('btnAddSpecial').addEventListener('click', ()=>{
  config.specialConditions.push({id: uid(), name:'Nouvelle condition', points:0});
  rebuildSpecialTable();
  renderSpecialButtons();
});


document.getElementById('btnGenGrid').addEventListener('click', ()=>{
  const rows = Math.max(1, Math.min(6, parseInt(document.getElementById('cfgRows').value || '1', 10)));
  const cols = Math.max(1, Math.min(6, parseInt(document.getElementById('cfgCols').value || '1', 10)));
  config.rows = rows; config.cols = cols;
  refreshTerrainUI();
});

document.getElementById('cfgLimitAttempts').addEventListener('change', (e)=>{
  const maxInput = document.getElementById('cfgMaxAttempts');
  maxInput.disabled = !e.target.checked;
  config.maxAttempts = e.target.checked ? Math.max(1, parseInt(maxInput.value || '1', 10)) : null;
  refreshObsCourtAndStats();
});

document.getElementById('cfgMaxAttempts').addEventListener('input', (e)=>{
  if(document.getElementById('cfgLimitAttempts').checked){
    config.maxAttempts = Math.max(1, parseInt(e.target.value || '1', 10));
    refreshObsCourtAndStats();
  }
});

/* ===================== CONFIGURATION : ÉLÈVES & GROUPES ===================== */
function refreshStudentsTable(){
  const tbody = document.getElementById('studentsBody');
  tbody.innerHTML = '';
  config.students.forEach(st=>{
    const tr = document.createElement('tr');
    const groupOptions = ['<option value="">—</option>'].concat(
      config.groups.map(g=>`<option value="${g}" ${g===st.group?'selected':''}>${g}</option>`)
    ).join('');
    tr.innerHTML = `
      <td><input type="text" value="${st.name}" data-id="${st.id}" class="studentName"></td>
      <td><select data-id="${st.id}" class="studentGroup">${groupOptions}</select></td>
      <td><button class="btn btn-danger studentDel" data-id="${st.id}" style="padding:5px 10px;">✕</button></td>
    `;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.studentName').forEach(inp=>{
    inp.addEventListener('input', ()=>{
      const st = config.students.find(s=>s.id===inp.dataset.id);
      if(st) st.name = inp.value;
    });
  });
  tbody.querySelectorAll('.studentGroup').forEach(sel=>{
    sel.addEventListener('change', ()=>{
      const st = config.students.find(s=>s.id===sel.dataset.id);
      if(st) st.group = sel.value;
    });
  });
  tbody.querySelectorAll('.studentDel').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      config.students = config.students.filter(s=>s.id!==btn.dataset.id);
      refreshStudentsTable();
    });
  });
}

function addStudents(names){
  const cleaned = names.map(n=>n.trim()).filter(Boolean);
  cleaned.forEach(name=>{
    config.students.push({id: uid(), name, group: config.groups[0] || ''});
  });
  refreshStudentsTable();
  if(cleaned.length) toast(cleaned.length + ' élève(s) ajouté(s)');
}

document.getElementById('btnAddManual').addEventListener('click', ()=>{
  const ta = document.getElementById('manualNames');
  const lines = ta.value.split('\n');
  addStudents(lines);
  ta.value = '';
});

document.getElementById('importFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const data = new Uint8Array(ev.target.result);
      const wb = XLSX.read(data, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1});
      let names = rows.map(r => (r && r[0] !== undefined) ? String(r[0]).trim() : '');
      // ignore likely header row
      if(names.length && /^(nom|élève|eleve|name|prénom|prenom)/i.test(names[0])){
        names = names.slice(1);
      }
      addStudents(names);
    }catch(err){
      toast('Erreur de lecture du fichier');
    }
  };
  reader.readAsArrayBuffer(file);
  e.target.value = '';
});

document.getElementById('btnAddGroup').addEventListener('click', ()=>{
  const inp = document.getElementById('newGroupName');
  const name = inp.value.trim();
  if(!name) return;
  if(!config.groups.includes(name)){
    config.groups.push(name);
    refreshStudentsTable();
    toast('Groupe « '+name+' » ajouté');
  }
  inp.value = '';
});

document.getElementById('btnClearStudents').addEventListener('click', ()=>{
  if(confirm('Supprimer tous les élèves de la configuration ? (les résultats déjà enregistrés ne seront pas supprimés)')){
    config.students = [];
    refreshStudentsTable();
  }
});

/* ===================== SAUVEGARDE / IMPORT-EXPORT CONFIG ===================== */
document.getElementById('btnSaveConfig').addEventListener('click', ()=>{
  saveConfig();
  toast('Configuration enregistrée');
  refreshObservation();
});

document.getElementById('btnExportConfig').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(config, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'configuration_badminton.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importConfigFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const obj = JSON.parse(ev.target.result);
      if(obj && obj.rows && obj.cols){
        config = obj;
        if(!Array.isArray(config.specialConditions)){
          config.specialConditions = [
            {id:'c1', name:'Faute', points:0},
            {id:'c2', name:'Sortie de terrain', points:0}
          ];
        }
        document.getElementById('cfgRows').value = config.rows;
        document.getElementById('cfgCols').value = config.cols;
        const limitChk = document.getElementById('cfgLimitAttempts');
        const maxInput = document.getElementById('cfgMaxAttempts');
        if(config.maxAttempts){
          limitChk.checked = true;
          maxInput.disabled = false;
          maxInput.value = config.maxAttempts;
        }else{
          limitChk.checked = false;
          maxInput.disabled = true;
        }
        refreshTerrainUI();
        rebuildSpecialTable();
        refreshStudentsTable();
        saveConfig();
        toast('Configuration importée');
      }else{
        toast('Fichier de configuration invalide');
      }
    }catch(err){ toast('Fichier de configuration invalide'); }
  };
  reader.readAsText(file);
  e.target.value = '';
});

/* ===================== OBSERVATION ===================== */
function refreshObservation(){
  const groupSel = document.getElementById('obsGroup');
  const studentSel = document.getElementById('obsStudent');
  const currentGroup = groupSel.value;
  const currentStudent = studentSel.value;

  groupSel.innerHTML = '<option value="">Tous</option>' +
    config.groups.map(g=>`<option value="${g}">${g}</option>`).join('');
  groupSel.value = config.groups.includes(currentGroup) ? currentGroup : '';

  const filtered = config.students.filter(s => !groupSel.value || s.group === groupSel.value);
  studentSel.innerHTML = filtered.map(s=>`<option value="${s.id}">${s.name}${s.group? ' — '+s.group:''}</option>`).join('');
  if(filtered.find(s=>s.id===currentStudent)) studentSel.value = currentStudent;

  document.getElementById('noStudentMsg').classList.toggle('hidden', config.students.length>0);

  refreshObsCourtAndStats();
}

document.getElementById('obsGroup').addEventListener('change', refreshObservation);
document.getElementById('obsStudent').addEventListener('change', refreshObsCourtAndStats);

function currentStudentId(){
  return document.getElementById('obsStudent').value;
}

function attemptsLimitReached(sid){
  if(!config.maxAttempts) return false;
  return records.filter(r=>r.studentId===sid).length >= config.maxAttempts;
}

function onZoneClick(zone, div){
  const sid = currentStudentId();
  if(!sid){ toast('Sélectionnez un élève'); return; }
  if(attemptsLimitReached(sid)){ toast('Nombre maximum de tentatives atteint'); return; }
  const bonus = config.zoneBonus[zone] || 0;
  records.push({studentId: sid, kind:'zone', zone, points: bonus, ts: Date.now()});
  saveRecords();
  div.classList.add('flash');
  setTimeout(()=>div.classList.remove('flash'), 150);
  refreshObsCourtAndStats();
}

function renderSpecialButtons(disabled){
  const container = document.getElementById('specialButtons');
  container.innerHTML = '';
  config.specialConditions.forEach(cond=>{
    const btn = document.createElement('button');
    btn.className = 'btn-special';
    btn.dataset.id = cond.id;
    btn.innerHTML = cond.name + (cond.points ? ` <span class="pts">(${cond.points>0?'+':''}${cond.points})</span>` : '');
    if(disabled){
      btn.disabled = true;
    }else{
      btn.addEventListener('click', ()=> onSpecialClick(cond, btn));
    }
    container.appendChild(btn);
  });
}

function onSpecialClick(cond, btn){
  const sid = currentStudentId();
  if(!sid){ toast('Sélectionnez un élève'); return; }
  if(attemptsLimitReached(sid)){ toast('Nombre maximum de tentatives atteint'); return; }
  records.push({studentId: sid, kind:'special', conditionId: cond.id, points: cond.points || 0, ts: Date.now()});
  saveRecords();
  btn.classList.add('flash');
  setTimeout(()=>btn.classList.remove('flash'), 150);
  refreshObsCourtAndStats();
}

function refreshObsCourtAndStats(){
  const sid = currentStudentId();
  const studentRecords = records.filter(r=>r.studentId===sid);
  const zoneRecords = studentRecords.filter(r=>r.kind==='zone' || r.kind===undefined);

  const total = studentRecords.length;
  const limitReached = !!sid && !!config.maxAttempts && total >= config.maxAttempts;

  buildCourtGrid(document.getElementById('obsCourt'), true, true, zoneRecords, limitReached);
  renderSpecialButtons(limitReached);

  const bonusTotal = studentRecords.reduce((s,r)=>s+(r.points!=null?r.points:(r.bonus||0)),0);
  const bonusHits = studentRecords.filter(r=>(r.points!=null?r.points:(r.bonus||0))>0).length;

  document.getElementById('statAttempts').textContent = config.maxAttempts ? `${total} / ${config.maxAttempts}` : `${total}`;
  document.getElementById('statBonus').textContent = bonusTotal;
  document.getElementById('statBonusRate').textContent = total ? Math.round(bonusHits/total*100)+'%' : '0%';

  let limitMsg = document.getElementById('limitMsg');
  if(!limitMsg){
    limitMsg = document.createElement('p');
    limitMsg.id = 'limitMsg';
    limitMsg.className = 'helper';
    limitMsg.style.color = 'var(--bonus)';
    limitMsg.style.fontWeight = '700';
    document.getElementById('specialButtons').insertAdjacentElement('afterend', limitMsg);
  }
  limitMsg.textContent = limitReached ? '⚠️ Nombre maximum de tentatives atteint pour cet élève.' : '';

  const tbody = document.getElementById('liveStatsBody');
  tbody.innerHTML = '';
  for(let z=1; z<=zoneCount(); z++){
    const n = zoneRecords.filter(r=>r.zone===z).length;
    const pct = total ? Math.round(n/total*100) : 0;
    const bonus = config.zoneBonus[z] || 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>Zone ${z}</td><td>${bonus>0? '+'+bonus : '—'}</td><td>${n}</td><td>${pct}%</td>`;
    tbody.appendChild(tr);
  }
  config.specialConditions.forEach(cond=>{
    const n = studentRecords.filter(r=>r.kind==='special' && r.conditionId===cond.id).length;
    const pct = total ? Math.round(n/total*100) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${cond.name}</td><td>${cond.points? (cond.points>0?'+':'')+cond.points : '—'}</td><td>${n}</td><td>${pct}%</td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('btnUndo').disabled = total===0;
  document.getElementById('btnResetStudent').disabled = total===0;
}

document.getElementById('btnUndo').addEventListener('click', ()=>{
  const sid = currentStudentId();
  const idx = records.map((r,i)=>({r,i})).filter(o=>o.r.studentId===sid).map(o=>o.i).pop();
  if(idx !== undefined){
    records.splice(idx,1);
    saveRecords();
    refreshObsCourtAndStats();
    toast('Dernière saisie annulée');
  }
});

document.getElementById('btnResetStudent').addEventListener('click', ()=>{
  const sid = currentStudentId();
  const sel = document.getElementById('obsStudent');
  const name = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
  if(confirm('Réinitialiser tous les relevés de '+name+' ?')){
    records = records.filter(r=>r.studentId!==sid);
    saveRecords();
    refreshObsCourtAndStats();
  }
});

/* ===================== STATISTIQUES & EXPORT ===================== */
function refreshStats(){
  refreshMapStudentSelect();
  renderZoneMap();

  const groupSel = document.getElementById('statsGroup');
  const current = groupSel.value;
  groupSel.innerHTML = '<option value="">Tous</option>' +
    config.groups.map(g=>`<option value="${g}">${g}</option>`).join('');
  groupSel.value = config.groups.includes(current) ? current : '';

  const head = document.getElementById('summaryHead');
  let headHtml = '<th>Élève</th><th>Groupe</th><th>Tentatives</th>';
  for(let z=1; z<=zoneCount(); z++) headHtml += `<th>Zone ${z}</th>`;
  config.specialConditions.forEach(cond=> headHtml += `<th>${cond.name}</th>`);
  headHtml += '<th>Points</th>';
  head.innerHTML = headHtml;

  const body = document.getElementById('summaryBody');
  body.innerHTML = '';
  const filterGroup = groupSel.value;

  config.students
    .filter(s => !filterGroup || s.group === filterGroup)
    .forEach(s=>{
      const sr = records.filter(r=>r.studentId===s.id);
      const total = sr.length;
      const pointsTotal = sr.reduce((sum,r)=>sum+(r.points!=null?r.points:(r.bonus||0)),0);
      let row = `<td>${s.name}</td><td>${s.group||'—'}</td><td>${total}</td>`;
      for(let z=1; z<=zoneCount(); z++){
        const n = sr.filter(r=>(r.kind==='zone'||r.kind===undefined) && r.zone===z).length;
        const pct = total ? Math.round(n/total*100) : 0;
        row += `<td>${n}${total? ' ('+pct+'%)':''}</td>`;
      }
      config.specialConditions.forEach(cond=>{
        const n = sr.filter(r=>r.kind==='special' && r.conditionId===cond.id).length;
        const pct = total ? Math.round(n/total*100) : 0;
        row += `<td>${n}${total? ' ('+pct+'%)':''}</td>`;
      });
      row += `<td>${pointsTotal}</td>`;
      const tr = document.createElement('tr');
      tr.innerHTML = row;
      body.appendChild(tr);
    });
}

document.getElementById('statsGroup').addEventListener('change', refreshStats);
document.getElementById('mapStudent').addEventListener('change', renderZoneMap);
document.getElementById('mapModePills').addEventListener('click', (e)=>{
  const pill = e.target.closest('.pill');
  if(!pill) return;
  document.querySelectorAll('#mapModePills .pill').forEach(p=>p.classList.remove('active'));
  pill.classList.add('active');
  renderZoneMap();
});

function refreshMapStudentSelect(){
  const sel = document.getElementById('mapStudent');
  const current = sel.value;
  sel.innerHTML = '<option value="">Tous les élèves (cumul)</option>' +
    config.students.map(s=>`<option value="${s.id}">${s.name}${s.group? ' — '+s.group:''}</option>`).join('');
  if(config.students.find(s=>s.id===current)) sel.value = current;
}

function renderZoneMap(){
  const studentId = document.getElementById('mapStudent').value;
  const mode = document.querySelector('#mapModePills .pill.active').dataset.mode;

  let recs = records;
  if(studentId) recs = recs.filter(r=>r.studentId===studentId);
  const zoneRecs = recs.filter(r=>r.kind==='zone' || r.kind===undefined);
  const total = recs.length;

  const values = {};
  let maxVal = 0;
  for(let z=1; z<=zoneCount(); z++){
    const count = zoneRecs.filter(r=>r.zone===z).length;
    const v = (mode==='bonus') ? count * (config.zoneBonus[z]||0) : count;
    values[z] = v;
    if(v > maxVal) maxVal = v;
  }

  const container = document.getElementById('mapCourt');
  container.style.gridTemplateColumns = `repeat(${config.cols}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${config.rows}, 1fr)`;
  container.innerHTML = '';

  const colorRGB = (mode==='bonus') ? '230,83,60' : '255,205,60'; // bonus / shuttle
  for(let z=1; z<=zoneCount(); z++){
    const v = values[z];
    const intensity = maxVal > 0 ? v / maxVal : 0;
    const count = zoneRecs.filter(r=>r.zone===z).length;
    const pct = total ? Math.round(count/total*100) : 0;
    const bonus = config.zoneBonus[z] || 0;

    const div = document.createElement('div');
    div.className = 'zone';
    div.style.background = `rgba(${colorRGB}, ${(0.12 + intensity*0.78).toFixed(2)})`;
    if(intensity > 0.55) div.style.color = '#1b1b1b';

    const numSpan = document.createElement('span');
    numSpan.textContent = z;
    div.appendChild(numSpan);

    if(bonus > 0){
      const b = document.createElement('span');
      b.className = 'bonus-badge';
      b.textContent = '+' + bonus;
      div.appendChild(b);
    }

    const c = document.createElement('span');
    c.className = 'count';
    c.style.color = intensity > 0.55 ? '#1b1b1b' : '';
    c.textContent = (mode==='bonus')
      ? v + ' pt' + (v===1?'':'s')
      : count + ' tir' + (count===1?'':'s') + ' (' + pct + '%)';
    div.appendChild(c);

    container.appendChild(div);
  }

  document.getElementById('mapLegend').textContent = (mode==='bonus')
    ? 'La couleur est proportionnelle aux points de bonification cumulés dans chaque zone (nombre de tentatives × bonus de la zone). Les zones sans bonus restent claires même si elles sont souvent atteintes.'
    : 'La couleur est proportionnelle au nombre de tentatives reçues par chaque zone (la zone la plus visée est la plus foncée).';

  const specBody = document.getElementById('mapSpecialBody');
  specBody.innerHTML = '';
  config.specialConditions.forEach(cond=>{
    const n = recs.filter(r=>r.kind==='special' && r.conditionId===cond.id).length;
    const pct = total ? Math.round(n/total*100) : 0;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${cond.name}</td><td>${n}</td><td>${pct}%</td>`;
    specBody.appendChild(tr);
  });
}

document.getElementById('btnExportExcel').addEventListener('click', ()=>{
  const wb = XLSX.utils.book_new();

  // Feuille résumé
  const summary = [];
  const header = ['Élève','Groupe','Tentatives'];
  for(let z=1; z<=zoneCount(); z++) header.push('Zone '+z, 'Zone '+z+' %');
  config.specialConditions.forEach(cond=> header.push(cond.name, cond.name+' %'));
  header.push('Points');
  summary.push(header);

  config.students.forEach(s=>{
    const sr = records.filter(r=>r.studentId===s.id);
    const total = sr.length;
    const pointsTotal = sr.reduce((sum,r)=>sum+(r.points!=null?r.points:(r.bonus||0)),0);
    const row = [s.name, s.group||'', total];
    for(let z=1; z<=zoneCount(); z++){
      const n = sr.filter(r=>(r.kind==='zone'||r.kind===undefined) && r.zone===z).length;
      row.push(n, total? Math.round(n/total*100)+'%':'0%');
    }
    config.specialConditions.forEach(cond=>{
      const n = sr.filter(r=>r.kind==='special' && r.conditionId===cond.id).length;
      row.push(n, total? Math.round(n/total*100)+'%':'0%');
    });
    row.push(pointsTotal);
    summary.push(row);
  });
  const wsSummary = XLSX.utils.aoa_to_sheet(summary);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

  // Feuille détails
  const details = [['Élève','Groupe','Type','Zone / Condition','Points','Horodatage']];
  records.forEach(r=>{
    const s = config.students.find(st=>st.id===r.studentId);
    let label, type;
    if(r.kind==='special'){
      const cond = config.specialConditions.find(c=>c.id===r.conditionId);
      type = 'Condition spéciale';
      label = cond ? cond.name : r.conditionId;
    }else{
      type = 'Zone';
      label = 'Zone '+r.zone;
    }
    details.push([
      s? s.name : r.studentId,
      s? (s.group||'') : '',
      type,
      label,
      (r.points!=null?r.points:(r.bonus||0)),
      new Date(r.ts).toLocaleString('fr-FR')
    ]);
  });
  const wsDetails = XLSX.utils.aoa_to_sheet(details);
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Détails');

  XLSX.writeFile(wb, 'resultats_badminton_'+new Date().toISOString().slice(0,10)+'.xlsx');
});

document.getElementById('btnResetAllRecords').addEventListener('click', ()=>{
  if(confirm('Effacer TOUS les résultats enregistrés pour tous les élèves ? Cette action est irréversible.')){
    records = [];
    saveRecords();
    refreshStats();
    refreshObsCourtAndStats();
    toast('Résultats effacés');
  }
});

document.getElementById('btnResetEverything').addEventListener('click', ()=>{
  if(confirm('Tout réinitialiser (configuration ET résultats) ? Cette action est irréversible.')){
    localStorage.removeItem(LS_CONFIG);
    localStorage.removeItem(LS_RECORDS);
    location.reload();
  }
});

/* ===================== INITIALISATION ===================== */
function init(){
  loadAll();
  document.getElementById('cfgRows').value = config.rows;
  document.getElementById('cfgCols').value = config.cols;
  const limitChk = document.getElementById('cfgLimitAttempts');
  const maxInput = document.getElementById('cfgMaxAttempts');
  if(config.maxAttempts){
    limitChk.checked = true;
    maxInput.disabled = false;
    maxInput.value = config.maxAttempts;
  }else{
    limitChk.checked = false;
    maxInput.disabled = true;
  }
  refreshTerrainUI();
  rebuildSpecialTable();
  refreshStudentsTable();
  refreshObservation();
  refreshStats();
}
init();
