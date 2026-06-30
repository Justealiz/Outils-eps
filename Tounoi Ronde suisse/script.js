'use strict';

// ─── STATE ──────────────────────────────────────────────────────────────────
const S = {
  view: 'config',
  mode: 'individual',
  started: false,
  config: { rounds: 4, winPts: 1, drawPts: 0.5, lossPts: 0, pairing: 'random' },
  players: [],
  teams: [],
  rounds: [],
  roundView: 0,
  sFilter: 'all',
  jFilter: 'all',
};

// ─── UTILS ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const ic = n => `<i class="ti ti-${n}"></i>`;
const genId = () => Math.random().toString(36).substr(2, 9);
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// ─── TOAST ──────────────────────────────────────────────────────────────────
function toast(msg, isErr = false) {
  const tw = $('twrap');
  const d = document.createElement('div');
  d.className = 'toast' + (isErr ? ' ter' : '');
  d.innerHTML = msg + `<button class="tx" onclick="this.parentElement.remove()">&#10005;</button>`;
  tw.appendChild(d);
  setTimeout(() => d.remove && d.remove(), 3800);
}

// ─── HEADER SUB ─────────────────────────────────────────────────────────────
function updateSub() {
  const el = $('app-sub');
  if (!el) return;
  const mLabel = S.mode === 'individual' ? 'Individuel' : 'Équipes';
  const ps = S.mode === 'individual' ? S.players.length : S.teams.length;
  const status = S.started ? `Ronde ${S.rounds.length}/${S.config.rounds}` : 'Non démarré';
  el.textContent = `${mLabel} · ${ps} participant(s) · ${status}`;
}

// ─── NAVIGATION ─────────────────────────────────────────────────────────────
function showView(v) {
  S.view = v;
  document.querySelectorAll('.vtab').forEach(t => t.classList.toggle('on', t.dataset.view === v));
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('on', el.id === 'v-' + v));
  updateView();
  closeAllDD();
}

function updateView() {
  updateSub();
  if (S.view === 'live')    updateLive();
  else if (S.view === 'rondes')  updateRondes();
  else if (S.view === 'joueurs') updateJoueurs();
  else                           updateConfig();
}

// ─── DROPDOWNS ──────────────────────────────────────────────────────────────
function toggleDD(id) {
  const m = $(id);
  const wasOpen = m.classList.contains('open');
  closeAllDD();
  if (!wasOpen) m.classList.add('open');
}
function closeAllDD() {
  document.querySelectorAll('.dd-menu').forEach(m => m.classList.remove('open'));
}
document.addEventListener('click', e => { if (!e.target.closest('.dd')) closeAllDD(); });

// ─── PLAYERS ────────────────────────────────────────────────────────────────
function getClasses() {
  return [...new Set(S.players.map(p => p.class).filter(Boolean))].sort();
}
function getParticipants() {
  return S.mode === 'team' ? S.teams : S.players;
}

function addPlayer(name, cls, seed, silent) {
  const n = name !== undefined ? name : ($('add-name') ? $('add-name').value.trim() : '');
  const c = cls !== undefined ? cls : ($('add-class') ? $('add-class').value.trim() : '');
  const sd = seed !== undefined ? +seed : 0;
  if (!n) { if (!silent) toast('Entrez un nom.', true); return; }
  S.players.push({ id: genId(), name: n, class: c, seed: sd, pts: 0, wins: 0, draws: 0, losses: 0, opponents: [], bye: false });
  if (!silent) {
    if ($('add-name')) $('add-name').value = '';
    if ($('add-class')) $('add-class').value = '';
    toast(`${esc(n)} ajouté·e.`);
    updateView();
  }
}

function removePlayer(id) {
  S.players = S.players.filter(p => p.id !== id);
  toast('Joueur supprimé.');
  updateView();
}

function resetScores() {
  S.players.forEach(p => { p.pts=0; p.wins=0; p.draws=0; p.losses=0; p.opponents=[]; p.bye=false; });
  S.teams.forEach(t => { t.pts=0; t.wins=0; t.draws=0; t.losses=0; t.opponents=[]; t.bye=false; });
}

// ─── TEAMS ──────────────────────────────────────────────────────────────────
function addTeam() {
  const inp = $('new-team-name');
  const name = inp && inp.value.trim() ? inp.value.trim() : `Équipe ${S.teams.length + 1}`;
  S.teams.push({ id: genId(), name, members: [], pts: 0, wins: 0, draws: 0, losses: 0, opponents: [], bye: false });
  if (inp) inp.value = '';
  renderTeamBuilder();
  toast(`Équipe "${esc(name)}" créée.`);
}
function renameTeam(tid, val) {
  const t = S.teams.find(x => x.id === tid);
  if (t && val.trim()) t.name = val.trim();
}
function deleteTeam(tid) {
  S.teams = S.teams.filter(x => x.id !== tid);
  renderTeamBuilder();
}
function autoTeams() {
  S.teams = [];
  const shuffled = [...S.players].sort(() => Math.random() - .5);
  for (let i = 0; i < shuffled.length; i += 2) {
    const members = shuffled.slice(i, i + 2);
    S.teams.push({ id: genId(), name: `Équipe ${S.teams.length + 1}`, members: members.map(p => p.id), pts: 0, wins: 0, draws: 0, losses: 0, opponents: [], bye: false });
  }
  renderTeamBuilder();
  toast('Équipes créées automatiquement (2/équipe).');
}
function renderTeamBuilder() {
  const el = $('team-builder-body');
  if (!el) return;
  const assigned = new Set(S.teams.flatMap(t => t.members));
  let html = '<div class="team-grid">';
  S.teams.forEach(t => {
    const memberTags = t.members.map(mid => {
      const p = S.players.find(x => x.id === mid);
      return p ? `<span class="pct" style="margin:2px;display:inline-block">${esc(p.name)}</span>` : '';
    }).join('');
    html += `<div class="team-box">
      <div class="team-box-hd">
        <input class="team-name-input" value="${esc(t.name)}" oninput="renameTeam('${t.id}',this.value)" title="Cliquer pour renommer">
        <span style="font-size:10px;color:var(--muted)">(${t.members.length})</span>
        <button class="tdel" onclick="deleteTeam('${t.id}')" title="Supprimer">&#10005;</button>
      </div>
      <div>${memberTags || '<span style="font-size:11px;color:var(--muted);font-style:italic">Vide</span>'}</div>
    </div>`;
  });
  html += '</div>';
  const unassigned = S.players.filter(p => !assigned.has(p.id));
  html += `<div style="margin-top:14px">
    <div class="section-lbl">Non assignés (${unassigned.length})</div>
    <div class="flex">${unassigned.map(p => `<span class="pct">${esc(p.name)}</span>`).join('') || '<span style="font-size:12px;color:var(--green)">Tous assignés ✓</span>'}</div>
  </div>`;
  el.innerHTML = html;
}

// ─── IMPORT ─────────────────────────────────────────────────────────────────
function triggerImport(type) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = type === 'restore' ? '.json' : '.csv,.xlsx,.xls';
  inp.onchange = type === 'restore' ? loadTournament : importPlayers;
  inp.click();
  closeAllDD();
}
function importPlayers(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      let rows = [];
      if (file.name.toLowerCase().endsWith('.csv')) {
        const lines = e.target.result.split('\n').filter(l => l.trim());
        const headers = lines[0].split(/[,;]/).map(h => h.trim().toLowerCase().replace(/"/g,''));
        rows = lines.slice(1).map(l => {
          const vals = l.split(/[,;]/);
          const obj = {};
          headers.forEach((h, i) => obj[h] = (vals[i]||'').trim().replace(/^"|"$/g,''));
          return obj;
        });
      } else {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      }
      let added = 0;
      rows.forEach(row => {
        const lk = Object.fromEntries(Object.entries(row).map(([k,v])=>[k.toLowerCase().trim(),v]));
        const name = lk['nom']||lk['name']||lk['prenom nom']||lk['prénom nom']||Object.values(row)[0]||'';
        const cls = lk['classe']||lk['class']||lk['groupe']||'';
        const seed = parseInt(lk['classement']||lk['seed']||lk['rang']||0)||0;
        if (String(name).trim()) { addPlayer(String(name).trim(), String(cls).trim(), seed, true); added++; }
      });
      toast(`${added} joueur(s) importé(s).`);
      updateView();
    } catch(err) { toast('Erreur import : ' + err.message, true); }
  };
  if (file.name.toLowerCase().endsWith('.csv')) reader.readAsText(file, 'UTF-8');
  else reader.readAsBinaryString(file);
  evt.target.value = '';
}

function loadSampleData() {
  [['Alice Martin','3A',1],['Bruno Dupont','3A',2],['Carla Rossi','3B',3],
   ['David Müller','3B',4],['Eva Chen','4A',5],['Félix Bernard','4A',6],
   ['Grace Lee','4B',7],['Hugo Petit','4B',8],['Inès Moreau','3A',9],
   ['Jonas Koch','3B',10],['Kévin Blanc','4A',11],['Laura Schmitt','4B',12]
  ].forEach(([n,c,s]) => addPlayer(n, c, s, true));
  toast('Données démo chargées (12 élèves).');
  updateView();
}

// ─── SAVE / LOAD ────────────────────────────────────────────────────────────
function saveTournament() {
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `tournoi_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Tournoi sauvegardé.');
  closeAllDD();
}
function loadTournament(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const loaded = JSON.parse(e.target.result);
      Object.assign(S, loaded);
      updateView();
      toast('Tournoi chargé !');
    } catch { toast('Fichier invalide.', true); }
  };
  reader.readAsText(file);
  evt.target.value = '';
}

// ─── EXPORT EXCEL ───────────────────────────────────────────────────────────
function exportExcel() {
  closeAllDD();
  const wb = XLSX.utils.book_new();
  const sorted = getSortedStandings();
  const s1 = [['#','Nom','Classe','Points','Victoires','Nuls','Défaites','Buchholz']];
  sorted.forEach((p, i) => s1.push([i+1, p.name, p.class||'', p.pts, p.wins, p.draws, p.losses, +buchholz(p).toFixed(1)]));
  const ws1 = XLSX.utils.aoa_to_sheet(s1);
  ws1['!cols'] = [{wch:5},{wch:25},{wch:12},{wch:8},{wch:10},{wch:6},{wch:10},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws1, 'Classement');
  S.rounds.forEach((round, ri) => {
    const data = [['Match','Participant 1','Classe 1','Participant 2','Classe 2','Résultat']];
    const ps = getParticipants();
    round.forEach((m, mi) => {
      const p1 = ps.find(p => p.id === m.p1id);
      const p2 = m.p2id ? ps.find(p => p.id === m.p2id) : null;
      const res = m.winner==='p1'?(p1?.name+' gagne'):m.winner==='p2'?(p2?.name+' gagne'):m.winner==='draw'?'Nul':m.winner==='bye'?'BYE':'—';
      data.push([mi+1, p1?.name||'?', p1?.class||'', p2?.name||'(BYE)', p2?.class||'', res]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{wch:6},{wch:22},{wch:10},{wch:22},{wch:10},{wch:18}];
    XLSX.utils.book_append_sheet(wb, ws, `Ronde ${ri+1}`);
  });
  XLSX.writeFile(wb, `tournoi_suisse_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.xlsx`);
  toast('Export Excel téléchargé.');
}

// ─── TOURNAMENT LOGIC ────────────────────────────────────────────────────────
function startTournament() {
  const ps = getParticipants();
  if (ps.length < 2) { toast('Il faut au moins 2 participants.', true); return; }
  const r = parseInt($('cfg-rounds')?.value)||4;
  S.config = {
    rounds: r,
    winPts: parseFloat($('cfg-win')?.value)||1,
    drawPts: parseFloat($('cfg-draw')?.value)||0.5,
    lossPts: parseFloat($('cfg-loss')?.value)||0,
    pairing: $('cfg-pairing')?.value||'random',
  };
  resetScores();
  S.rounds = []; S.started = true; S.roundView = 0;
  generateRound1();
  showView('live');
  toast('Tournoi lancé ! Bonne chance à tous 🏆');
}

function generateRound1() {
  const participants = getParticipants();
  let ordered;
  if (S.config.pairing === 'random') ordered = [...participants].sort(() => Math.random()-.5);
  else if (S.config.pairing === 'seed') ordered = [...participants].sort((a,b)=>(a.seed||999)-(b.seed||999));
  else ordered = [...participants];
  S.rounds.push(buildPairings(ordered));
}

function buildPairings(ordered) {
  const matches = [];
  const list = [...ordered];
  let byePlayer = null;
  if (list.length % 2 !== 0) {
    let bi = list.length - 1;
    for (let i = list.length - 1; i >= 0; i--) { if (!list[i].bye) { bi = i; break; } }
    byePlayer = list.splice(bi, 1)[0];
  }
  for (let i = 0; i < list.length; i += 2) {
    matches.push({ p1id: list[i].id, p2id: list[i+1].id, winner: null });
  }
  if (byePlayer) {
    const bm = { p1id: byePlayer.id, p2id: null, winner: 'bye' };
    matches.push(bm);
    applyResult(bm);
    byePlayer.bye = true;
  }
  return matches;
}

function generateNextRound() {
  if (!S.started) { toast('Lancez d\'abord le tournoi.', true); return; }
  if (S.rounds.length >= S.config.rounds) { toast('Nombre maximum de rondes atteint.', true); return; }
  const unfinished = S.rounds[S.rounds.length-1].filter(m => m.winner===null).length;
  const doGen = () => {
    const sorted = [...getParticipants()].sort((a,b) => b.pts!==a.pts ? b.pts-a.pts : buchholz(b)-buchholz(a));
    S.rounds.push(swissPair(sorted));
    S.roundView = S.rounds.length - 1;
    updateView();
    toast(`Ronde ${S.rounds.length} générée !`);
  };
  if (unfinished > 0) {
    if (confirm(`${unfinished} match(s) sans résultat. Générer quand même la ronde suivante ?`)) doGen();
  } else {
    doGen();
  }
}

function swissPair(sorted) {
  const used = new Set();
  const matches = [];
  let byePlayer = null;
  const list = [...sorted];
  if (list.length % 2 !== 0) {
    for (let i = list.length-1; i >= 0; i--) {
      if (!list[i].bye) { byePlayer = list.splice(i,1)[0]; break; }
    }
    if (!byePlayer) byePlayer = list.pop();
  }
  const groups = {};
  list.forEach(p => { if (!groups[p.pts]) groups[p.pts]=[]; groups[p.pts].push(p); });
  const scores = Object.keys(groups).sort((a,b)=>b-a);
  let leftover = null;
  scores.forEach(score => {
    let group = groups[score];
    if (leftover) { group = [leftover, ...group]; leftover = null; }
    for (let i = 0; i < group.length; i++) {
      if (used.has(group[i].id)) continue;
      let paired = false;
      for (let j = i+1; j < group.length; j++) {
        if (used.has(group[j].id)) continue;
        if (!group[i].opponents.includes(group[j].id)) {
          matches.push({ p1id: group[i].id, p2id: group[j].id, winner: null });
          used.add(group[i].id); used.add(group[j].id); paired = true; break;
        }
      }
      if (!paired && !used.has(group[i].id)) leftover = group[i];
    }
  });
  if (leftover) {
    const u = list.find(p => !used.has(p.id) && p.id !== leftover.id);
    if (u) { matches.push({ p1id: leftover.id, p2id: u.id, winner: null }); used.add(leftover.id); used.add(u.id); }
  }
  if (byePlayer) {
    const bm = { p1id: byePlayer.id, p2id: null, winner: 'bye' };
    matches.push(bm); applyResult(bm); byePlayer.bye = true;
  }
  return matches;
}

function applyResult(match) {
  const cfg = S.config;
  const ps = getParticipants();
  const fp = id => ps.find(p => p.id === id);
  if (match.winner === 'bye') {
    const p = fp(match.p1id);
    if (p) { p.pts += cfg.winPts; p.wins++; }
    return;
  }
  const p1 = fp(match.p1id), p2 = fp(match.p2id);
  if (!p1 || !p2) return;
  if (!p1.opponents.includes(p2.id)) p1.opponents.push(p2.id);
  if (!p2.opponents.includes(p1.id)) p2.opponents.push(p1.id);
  if (match.winner==='p1')       { p1.pts+=cfg.winPts; p1.wins++; p2.pts+=cfg.lossPts; p2.losses++; }
  else if (match.winner==='p2')  { p2.pts+=cfg.winPts; p2.wins++; p1.pts+=cfg.lossPts; p1.losses++; }
  else if (match.winner==='draw'){ p1.pts+=cfg.drawPts; p1.draws++; p2.pts+=cfg.drawPts; p2.draws++; }
}

function undoResult(match) {
  const cfg = S.config;
  const ps = getParticipants();
  const fp = id => ps.find(p => p.id === id);
  if (match.winner === 'bye') {
    const p = fp(match.p1id);
    if (p) { p.pts -= cfg.winPts; p.wins--; }
    return;
  }
  const p1 = fp(match.p1id), p2 = fp(match.p2id);
  if (!p1 || !p2) return;
  if (match.winner==='p1')       { p1.pts-=cfg.winPts; p1.wins--; p2.pts-=cfg.lossPts; p2.losses--; }
  else if (match.winner==='p2')  { p2.pts-=cfg.winPts; p2.wins--; p1.pts-=cfg.lossPts; p1.losses--; }
  else if (match.winner==='draw'){ p1.pts-=cfg.drawPts; p1.draws--; p2.pts-=cfg.drawPts; p2.draws--; }
  const still = S.rounds.some(r => r.some(m => m!==match && m.winner!==null &&
    ((m.p1id===p1.id&&m.p2id===p2.id)||(m.p1id===p2.id&&m.p2id===p1.id))));
  if (!still) {
    p1.opponents = p1.opponents.filter(id => id!==p2.id);
    p2.opponents = p2.opponents.filter(id => id!==p1.id);
  }
}

function clickWinner(ri, mi, side) {
  const match = S.rounds[ri][mi];
  if (match.winner==='bye') return;
  if (match.winner === side) { undoResult(match); match.winner = null; }
  else { if (match.winner!==null) undoResult(match); match.winner=side; applyResult(match); }
  updateView();
}

function setDraw(ri, mi) {
  const match = S.rounds[ri][mi];
  if (match.winner !== null) undoResult(match);
  match.winner = match.winner === 'draw' ? null : 'draw';
  if (match.winner === 'draw') applyResult(match);
  updateView();
}

function navRound(dir) {
  S.roundView = Math.max(0, Math.min(S.rounds.length-1, S.roundView+dir));
  updateView();
}

// ─── STANDINGS ──────────────────────────────────────────────────────────────
function buchholz(p) {
  const ps = getParticipants();
  return p.opponents.reduce((s, oid) => { const o = ps.find(x => x.id===oid); return s+(o?o.pts:0); }, 0);
}
function getSortedStandings() {
  return [...getParticipants()].sort((a,b) =>
    b.pts!==a.pts ? b.pts-a.pts : b.wins!==a.wins ? b.wins-a.wins : buchholz(b)-buchholz(a));
}

function newTournamentFromStandings() {
  closeAllDD();
  if (!confirm('Relancer un nouveau tournoi sur la base du classement actuel ? Les scores seront remis à zéro.')) return;
  getSortedStandings().forEach((p,i) => { p.seed = i+1; });
  resetScores();
  S.rounds = []; S.started = false; S.roundView = 0;
  showView('config');
  toast('Joueurs reclassés — prêt pour un nouveau tournoi !');
}

function confirmReset() {
  if (!confirm('Réinitialiser complètement le tournoi (joueurs, rondes, scores) ?')) return;
  S.players = []; S.teams = []; S.rounds = [];
  S.started = false; S.roundView = 0; S.sFilter = 'all'; S.jFilter = 'all';
  showView('config');
  toast('Tournoi réinitialisé.');
}

// ─── BUILD: MATCH CARDS ─────────────────────────────────────────────────────
function buildMatchCards(round, ri) {
  const ps = getParticipants();
  const fp = id => ps.find(p => p.id===id);
  return round.map((match, mi) => {
    const p1 = fp(match.p1id);
    const p2 = match.p2id ? fp(match.p2id) : null;
    const done = match.winner !== null;
    if (!p2) {
      return `<div class="match-card done">
        <div class="mnum">${mi+1}</div>
        <div class="msides">
          <div class="mp bye-p">
            <div class="mpn" style="color:var(--green)">${esc(p1?.name||'?')}</div>
            <div class="mpi">BYE &mdash; victoire automatique</div>
          </div>
        </div>
      </div>`;
    }
    const w1 = match.winner==='p1'?'winner':match.winner!==null?'loser':'';
    const w2 = match.winner==='p2'?'winner':match.winner!==null&&match.winner!=='draw'?'loser':'';
    const trophy1 = match.winner==='p1' ? ' ' + ic('trophy') : '';
    const trophy2 = match.winner==='p2' ? ' ' + ic('trophy') : '';
    const drawOn = match.winner==='draw';
    return `<div class="match-card ${done?'done':''}">
      <div class="mnum">${mi+1}</div>
      <div class="msides">
        <div class="mp ${w1}" onclick="clickWinner(${ri},${mi},'p1')" title="Cliquer pour déclarer vainqueur">
          <div class="mpn">${esc(p1?.name||'?')}${trophy1}</div>
          <div class="mpi">${esc(p1?.class||'')} &middot; ${p1?.pts||0} pts &middot; ${p1?.wins||0}V</div>
        </div>
        <div class="mvs">VS</div>
        <div class="mp ${w2}" onclick="clickWinner(${ri},${mi},'p2')" title="Cliquer pour déclarer vainqueur">
          <div class="mpn">${esc(p2?.name||'?')}${trophy2}</div>
          <div class="mpi">${esc(p2?.class||'')} &middot; ${p2?.pts||0} pts &middot; ${p2?.wins||0}V</div>
        </div>
        <button class="btn-draw ${drawOn?'on':''}" onclick="setDraw(${ri},${mi})">
          ${drawOn ? ic('check')+' Nul' : 'Nul'}
        </button>
      </div>
    </div>`;
  }).join('');
}

// ─── BUILD: ROUND PANEL ─────────────────────────────────────────────────────
function buildRoundPanel(ri) {
  if (!S.rounds.length) return `<div class="card"><div class="empty" style="padding:30px"><i class="ti ti-swords"></i><p>Aucune ronde encore générée.</p></div></div>`;
  const safeRi = Math.min(ri, S.rounds.length-1);
  const round = S.rounds[safeRi];
  const done = round.filter(m => m.winner!==null).length;
  const pct = Math.round(done/round.length*100);
  const isLast = safeRi === S.rounds.length-1;
  const canGen = isLast && S.rounds.length < S.config.rounds;
  const allDone = done === round.length;
  const finished = S.rounds.length >= S.config.rounds;
  let genBtn = '';
  if (finished && allDone) {
    genBtn = `<span style="font-size:11px;color:var(--green)">${ic('trophy')} Tournoi terminé !</span>`;
  } else if (canGen) {
    genBtn = `<button class="btn ${allDone?'btn-p':'btn-g'} btn-sm" onclick="generateNextRound()">
      ${ic('player-play')} Ronde ${S.rounds.length+1}
    </button>`;
  }
  return `<div class="card">
    <div class="round-ph">
      <div class="rtitle">${ic('swords')} Ronde ${safeRi+1}</div>
      <div class="rnav">
        <button class="nav-btn" onclick="navRound(-1)" ${safeRi===0?'disabled':''}>${ic('chevron-left')}</button>
        <span class="rind">${safeRi+1} / ${S.rounds.length}</span>
        <button class="nav-btn" onclick="navRound(1)" ${safeRi===S.rounds.length-1?'disabled':''}>${ic('chevron-right')}</button>
        ${genBtn}
      </div>
    </div>
    <div class="progress"><div class="progress-fill" style="width:${pct}%"></div></div>
    <div style="font-size:11px;color:var(--muted);margin-bottom:10px">${ic('checks')} ${done}/${round.length} matchs terminés &mdash; cliquez sur un participant pour le déclarer vainqueur</div>
    <div class="match-list">${buildMatchCards(round, safeRi)}</div>
  </div>`;
}

// ─── RENDER: LIVE ───────────────────────────────────────────────────────────
function updateLive() {
  const el = $('v-live');
  if (!el) return;
  if (!S.started) {
    el.innerHTML = `<div class="not-started">
      <i class="ti ti-tournament"></i>
      <h2>Aucun tournoi en cours</h2>
      <p>Rendez-vous dans l'onglet <strong>Config</strong> pour paramétrer et lancer le tournoi.</p>
      <button class="btn btn-p" onclick="showView('config')">${ic('settings')} Configurer le tournoi</button>
    </div>`;
    return;
  }
  const ps = getParticipants();
  const allM = S.rounds.flatMap(r=>r);
  const doneM = allM.filter(m=>m.winner!==null).length;
  const leader = getSortedStandings()[0];
  const safeRi = Math.min(S.roundView, S.rounds.length-1);
  const metrics = `<div class="metric-grid">
    <div class="metric">${ic('users')}<div><div class="val">${ps.length}</div><div class="lbl">Participants</div></div></div>
    <div class="metric">${ic('tournament')}<div><div class="val">${S.rounds.length}/${S.config.rounds}</div><div class="lbl">Rondes</div></div></div>
    <div class="metric">${ic('checks')}<div><div class="val">${doneM}/${allM.length}</div><div class="lbl">Matchs terminés</div></div></div>
    <div class="metric">${ic('trophy')}<div><div class="val" style="font-size:16px;font-family:'Barlow'">${esc(leader?.name.split(' ')[0]||'—')}</div><div class="lbl">Leader &mdash; ${leader?.pts||0} pts</div></div></div>
  </div>`;
  const classes = getClasses();
  const sorted = getSortedStandings();
  const filtered = S.sFilter==='all' ? sorted : sorted.filter(p=>p.class===S.sFilter);
  const chips = `<div class="chip-row">
    <button class="chip ${S.sFilter==='all'?'on':''}" onclick="setSFilter('all')">Toutes</button>
    ${classes.map(c=>`<button class="chip ${S.sFilter===c?'on':''}" onclick="setSFilter('${esc(c)}')">${esc(c)}</button>`).join('')}
  </div>`;
  const rows = filtered.map(p => {
    const rank = sorted.indexOf(p)+1;
    const cls = rank===1?'r1':rank===2?'r2':rank===3?'r3':'rn';
    return `<tr>
      <td><span class="rb ${cls}">${rank}</span></td>
      <td><strong>${esc(p.name)}</strong></td>
      <td><span class="pct">${esc(p.class||'–')}</span></td>
      <td><span class="bg">${p.pts}</span></td>
      <td style="color:var(--green);font-weight:700">${p.wins}</td>
      <td style="color:var(--muted)">${p.losses}</td>
      <td style="color:var(--muted);font-size:11px">${buchholz(p).toFixed(1)}</td>
    </tr>`;
  }).join('');
  const standingsPanel = `<div class="card">
    <div class="card-title">${ic('list-numbers')} Classement en direct</div>
    ${chips}
    <div class="tbl-wrap" style="max-height:500px;overflow-y:auto">
      <table>
        <thead><tr><th>#</th><th>Nom</th><th>Classe</th><th>Pts</th><th>V</th><th>D</th><th>Buch.</th></tr></thead>
        <tbody>${rows||'<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:20px">–</td></tr>'}</tbody>
      </table>
    </div>
  </div>`;
  el.innerHTML = metrics + `<div class="live-layout">
    <div>${standingsPanel}</div>
    <div>${buildRoundPanel(safeRi)}</div>
  </div>`;
}

function setSFilter(c) { S.sFilter=c; if(S.view==='live') updateLive(); }

// ─── RENDER: RONDES ─────────────────────────────────────────────────────────
function updateRondes() {
  const el = $('v-rondes');
  if (!el) return;
  if (!S.started || !S.rounds.length) {
    el.innerHTML = `<div class="not-started">
      <i class="ti ti-swords"></i>
      <h2>Pas encore de rondes</h2>
      <p>Lancez le tournoi depuis l'onglet Config.</p>
    </div>`; return;
  }
  const safeRi = Math.min(S.roundView, S.rounds.length-1);
  const tabs = S.rounds.map((r,i) => {
    const d = r.filter(m=>m.winner!==null).length;
    const full = d===r.length;
    return `<button class="chip ${i===safeRi?'on':''}" onclick="goToRound(${i})">
      ${full ? ic('check') : ''} Ronde ${i+1} <span style="font-size:9px">(${d}/${r.length})</span>
    </button>`;
  }).join('');
  el.innerHTML = `<div class="chip-row" style="margin-bottom:16px">${tabs}</div>${buildRoundPanel(safeRi)}`;
}

function goToRound(i) {
  S.roundView = i;
  updateView();
}

// ─── RENDER: JOUEURS ────────────────────────────────────────────────────────
function updateJoueurs() {
  const el = $('v-joueurs');
  if (!el) return;
  const ps = S.players;
  const classes = getClasses();
  const chips = `<div class="chip-row">
    <button class="chip ${S.jFilter==='all'?'on':''}" onclick="setJFilter('all')">Toutes</button>
    ${classes.map(c=>`<button class="chip ${S.jFilter===c?'on':''}" onclick="setJFilter('${esc(c)}')">${esc(c)}</button>`).join('')}
  </div>`;
  const filtered = S.jFilter==='all' ? ps : ps.filter(p=>p.class===S.jFilter);
  const rows = filtered.map((p,i) => {
    const rank=i+1, cls=rank===1?'r1':rank===2?'r2':rank===3?'r3':'rn';
    const stats = S.started ? `<span class="bg">${p.pts}pts</span> <small style="color:var(--muted)">${p.wins}V ${p.draws}N ${p.losses}D</small>` : `<span style="color:var(--muted)">–</span>`;
    return `<tr>
      <td><span class="rb ${cls}">${rank}</span></td>
      <td><strong>${esc(p.name)}</strong></td>
      <td><span class="pct">${esc(p.class||'–')}</span></td>
      <td>${p.seed||'–'}</td>
      <td>${stats}</td>
      <td><button class="btn btn-d btn-sm" onclick="removePlayer('${p.id}')">${ic('x')}</button></td>
    </tr>`;
  }).join('');
  const sortItems = ps.map((p,i) => `<li draggable="true" data-id="${p.id}">
    <span class="drag-handle">${ic('grip-vertical')}</span>
    <span class="rb rn" style="width:20px;height:20px;font-size:10px">${i+1}</span>
    <span style="flex:1">${esc(p.name)}</span>
    ${p.class?`<span class="pct">${esc(p.class)}</span>`:''}
    ${p.seed?`<span class="pts-tag">#${p.seed}</span>`:''}
  </li>`).join('');
  el.innerHTML = `<div class="setup-grid">
    <div>
      <div class="card">
        <div class="card-title">${ic('users')} Participants (${ps.length})</div>
        <div class="flex mb14" style="font-size:12px;color:var(--muted)">
          ${ic('building')} ${classes.length} classe(s) &nbsp;|&nbsp; ${ic('mode-portrait')} Mode ${S.mode==='individual'?'individuel':'équipes'}
        </div>
        ${chips}
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>#</th><th>Nom</th><th>Classe</th><th>Graine</th><th>Stats</th><th></th></tr></thead>
            <tbody>${rows||'<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:20px">Aucun joueur</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-title">${ic('arrows-sort')} Ordre de départ</div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Glissez-déposez pour modifier l'ordre d'appariement manuel de la 1ère ronde.</p>
        <ul class="pl-list" id="sort-list">${sortItems}</ul>
      </div>
    </div>
  </div>`;
  setupDragDrop();
}

function setJFilter(c) { S.jFilter=c; updateJoueurs(); }

// ─── DRAG & DROP ────────────────────────────────────────────────────────────
let dragSrc = null;
function setupDragDrop() {
  const list = $('sort-list');
  if (!list) return;
  list.addEventListener('dragstart', e => {
    dragSrc = e.target.closest('li');
    if (dragSrc) { dragSrc.classList.add('dragging'); e.dataTransfer.effectAllowed='move'; }
  });
  list.addEventListener('dragover', e => e.preventDefault());
  list.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('li');
    if (!target || !dragSrc || target===dragSrc) return;
    const items = [...list.children];
    const si = items.indexOf(dragSrc), di = items.indexOf(target);
    const [moved] = S.players.splice(si, 1);
    S.players.splice(di, 0, moved);
    updateJoueurs();
  });
  list.addEventListener('dragend', () => { if (dragSrc) dragSrc.classList.remove('dragging'); dragSrc=null; });
}

// ─── RENDER: CONFIG ─────────────────────────────────────────────────────────
function updateConfig() {
  const el = $('v-config');
  if (!el) return;
  const isTeam = S.mode==='team';
  const classes = getClasses();
  const classChips = classes.length
    ? classes.map(c => { const cnt=S.players.filter(p=>p.class===c).length; return `<span class="chip on" style="cursor:default">${esc(c)} (${cnt})</span>`; }).join('')
    : '<span style="font-size:12px;color:var(--muted)">Aucune classe détectée</span>';
  el.innerHTML = `<div class="setup-grid mb14">
    <div>
      <div class="card mb14">
        <div class="card-title">${ic('adjustments')} Paramètres</div>
        <div class="mode-toggle">
          <button class="mbtn ${!isTeam?'on':''}" onclick="setModeClick('individual')">${ic('user')} Individuel</button>
          <button class="mbtn ${isTeam?'on':''}" onclick="setModeClick('team')">${ic('users')} Équipes</button>
        </div>
        <div class="form-row">
          <div class="field"><label>Nombre de rondes</label><input type="number" id="cfg-rounds" value="${S.config.rounds}" min="1" max="20"></div>
          <div class="field"><label>Pts victoire</label><input type="number" id="cfg-win" value="${S.config.winPts}" min="0" step="0.5"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Pts nul</label><input type="number" id="cfg-draw" value="${S.config.drawPts}" min="0" step="0.5"></div>
          <div class="field"><label>Pts défaite</label><input type="number" id="cfg-loss" value="${S.config.lossPts}" min="0" step="0.5"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Appariement 1ère ronde</label>
            <select id="cfg-pairing">
              <option value="random" ${S.config.pairing==='random'?'selected':''}>Aléatoire</option>
              <option value="manual" ${S.config.pairing==='manual'?'selected':''}>Manuel (ordre de la liste)</option>
              <option value="seed" ${S.config.pairing==='seed'?'selected':''}>Par classement initial</option>
            </select>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">${ic('school')} Classes</div>
        <div class="chip-row">${classChips}</div>
      </div>
    </div>
    <div>
      <div class="card">
        <div class="card-title">${ic('users')} Joueurs (${S.players.length})</div>
        <p style="font-size:12px;color:var(--muted);margin-bottom:12px">Colonnes CSV/Excel acceptées : <strong>Nom</strong>, Classe, Classement</p>
        <div class="flex" style="margin-bottom:14px">
          <button class="btn btn-g btn-sm" onclick="triggerImport('players')">${ic('file-spreadsheet')} Importer CSV / Excel</button>
          <button class="btn btn-g btn-sm" onclick="loadSampleData()">${ic('dice')} Démo (12 élèves)</button>
        </div>
        <hr>
        <div class="section-lbl">Ajouter manuellement</div>
        <div class="form-row">
          <div class="field"><label>Nom</label><input type="text" id="add-name" placeholder="Prénom Nom" onkeydown="if(event.key==='Enter')addPlayer()"></div>
          <div class="field"><label>Classe</label><input type="text" id="add-class" placeholder="ex: 3A" onkeydown="if(event.key==='Enter')addPlayer()"></div>
          <div><label>&nbsp;</label><button class="btn btn-p btn-sm" onclick="addPlayer()">${ic('plus')} Ajouter</button></div>
        </div>
      </div>
    </div>
  </div>
  <div id="team-builder-section" style="display:${isTeam?'':'none'}">
    <div class="card mb14">
      <div class="card-title">${ic('users-group')} Composition des équipes</div>
      <div class="flex" style="margin-bottom:14px;flex-wrap:wrap">
        <input type="text" id="new-team-name" placeholder="Nom de la nouvelle équipe…" style="flex:1;min-width:160px;max-width:240px" onkeydown="if(event.key==='Enter')addTeam()">
        <button class="btn btn-g btn-sm" onclick="addTeam()">${ic('plus')} Créer</button>
        <button class="btn btn-g btn-sm" onclick="autoTeams()">${ic('wand')} Auto (2/équipe)</button>
      </div>
      <div id="team-builder-body"></div>
    </div>
  </div>
  <div style="display:flex;justify-content:flex-end">
    <button class="btn btn-p" style="font-size:15px;padding:13px 36px" onclick="startTournament()">
      ${ic('player-play')} Lancer le tournoi
    </button>
  </div>`;
  if (isTeam) renderTeamBuilder();
}

function setModeClick(m) {
  S.mode = m;
  updateConfig();
}

// ─── INIT ───────────────────────────────────────────────────────────────────
showView('config');