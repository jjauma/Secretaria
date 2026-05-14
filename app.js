// ============================================
// SECRETÀRIA — Fase 1.6
// ============================================

const STORAGE_KEY = 'secretaria_v2';
const API_KEY_STORAGE = 'secretaria_apikey';
const ARCHIVE_DAYS = 7;
const VOICE_SILENCE_MS = 2500; // pausa abans de tancar el dictat

// ---------- ESTAT ----------
let state = {
  activeTab: 'pro',
  arxiuSubTab: 'pro',
  tasks: { pro: [], personal: [] },
  composer: { deadline: null, priority: '', remind: false }
};

// Per saber quina tasca està expandida (n'hi pot haver una a la vegada)
let expandedId = null;

// ---------- PERSISTÈNCIA ----------
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.error('No s\'ha pogut guardar:', e); }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tasks) state.tasks = parsed.tasks;
      if (parsed.activeTab) state.activeTab = parsed.activeTab;
      ['pro','personal'].forEach(cat => {
        state.tasks[cat] = (state.tasks[cat] || []).map(t => ({
          id: t.id,
          text: t.text || '',
          done: !!t.done,
          createdAt: t.createdAt || Date.now(),
          doneAt: t.doneAt || null,
          deadline: t.deadline || null,
          priority: t.priority || '',
          remind: !!t.remind,
          subtasks: (t.subtasks || []).map(s => ({
            id: s.id, text: s.text, done: !!s.done
          }))
        }));
      });
    }
  } catch (e) { console.error('No s\'ha pogut carregar:', e); }
}

// ---------- DATES ----------
const DIES = ['diumenge','dilluns','dimarts','dimecres','dijous','divendres','dissabte'];
const MESOS = ['gener','febrer','març','abril','maig','juny','juliol','agost','setembre','octubre','novembre','desembre'];

function fmtAvui(d) {
  return `${DIES[d.getDay()]}, ${d.getDate()} de ${MESOS[d.getMonth()]}`;
}

function fmtDataCurta(ts) {
  const d = new Date(ts);
  const ara = new Date();
  const diffDies = Math.floor((ara - d) / 86400000);
  if (diffDies === 0) return 'avui';
  if (diffDies === 1) return 'ahir';
  if (diffDies < 7) return DIES[d.getDay()];
  return `${d.getDate()} ${MESOS[d.getMonth()].slice(0,3)}`;
}

function fmtDeadlineCurt(iso) {
  // Format compacte per la cel·la (3-4 caràcters)
  const [y,m,dd] = iso.split('-').map(Number);
  const d = new Date(y, m-1, dd);
  const avui = new Date(); avui.setHours(0,0,0,0);
  const diff = Math.round((d - avui) / 86400000);
  if (diff === 0) return 'avui';
  if (diff === 1) return 'demà';
  if (diff === -1) return 'ahir';
  if (diff > 1 && diff < 7) return DIES[d.getDay()].slice(0,3);
  if (diff <= -1 && diff > -7) return DIES[d.getDay()].slice(0,3);
  return `${d.getDate()}/${m}`;
}

function deadlineStatus(iso) {
  if (!iso) return null;
  const [y,m,dd] = iso.split('-').map(Number);
  const d = new Date(y, m-1, dd);
  const avui = new Date(); avui.setHours(0,0,0,0);
  const diff = Math.round((d - avui) / 86400000);
  if (diff < 0) return 'late';
  if (diff <= 1) return 'soon';
  return 'ok';
}

// ---------- HELPERS ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isArchivedAge(task) {
  if (!task.done || !task.doneAt) return false;
  return (Date.now() - task.doneAt) > ARCHIVE_DAYS * 86400000;
}

function findTask(id) {
  for (const cat of ['pro','personal']) {
    const t = state.tasks[cat].find(x => x.id === id);
    if (t) return { task: t, cat };
  }
  return null;
}

// ---------- RENDER ----------
function renderTasca(task) {
  const li = document.createElement('li');
  li.className = 'task' +
    (task.done ? ' done' : '') +
    (expandedId === task.id ? ' expanded' : '');
  li.dataset.id = task.id;

  const totalSub = task.subtasks.length;
  const doneSub = task.subtasks.filter(s => s.done).length;

  // Venç
  let dueHtml;
  if (task.deadline && !task.done) {
    const status = deadlineStatus(task.deadline);
    const cls = status === 'late' ? 'late' : (status === 'soon' ? 'soon' : '');
    dueHtml = `<span class="due-cell ${cls}">${fmtDeadlineCurt(task.deadline)}<input type="date" class="due-input" value="${task.deadline}" /></span>`;
  } else if (task.deadline && task.done) {
    dueHtml = `<span class="due-cell">${fmtDeadlineCurt(task.deadline)}</span>`;
  } else {
    dueHtml = `<span class="due-cell empty">—<input type="date" class="due-input" /></span>`;
  }

  // Prio - semàfor
  const prioClass = task.priority || 'baixa';
  const prioHtml = `
    <div class="prio-cell ${prioClass}" data-prio="${task.priority}">
      <div class="semafor">
        <div class="semafor-dot"></div>
        <div class="semafor-dot"></div>
        <div class="semafor-dot"></div>
      </div>
    </div>
  `;

  const subCountHtml = totalSub > 0
    ? `<span class="subtask-count">${doneSub}/${totalSub}</span>` : '';

  // Meta (només visible quan expandit)
  const metaTags = [`<span>creada ${fmtDataCurta(task.createdAt)}</span>`];
  if (task.done && task.doneAt) {
    metaTags.push(`<span class="done-tag">feta ${fmtDataCurta(task.doneAt)}</span>`);
  }

  li.innerHTML = `
    <div class="task-main">
      <input type="checkbox" class="check task-check" ${task.done ? 'checked' : ''} aria-label="Marca com a feta" />
      <div class="task-text" contenteditable="true" spellcheck="false">${escapeHtml(task.text)}</div>
      ${dueHtml}
      ${prioHtml}
      <div class="task-actions">
        <button class="icon-btn delete" aria-label="Eliminar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
          </svg>
          ${subCountHtml}
        </button>
      </div>
    </div>
    <div class="task-meta-row">${metaTags.join('')}</div>
    <div class="subtasks">
      ${task.subtasks.map(s => `
        <div class="subtask ${s.done ? 'done' : ''}" data-sub-id="${s.id}">
          <input type="checkbox" class="check sub-check" ${s.done ? 'checked' : ''} />
          <span class="subtask-text" contenteditable="true" spellcheck="false">${escapeHtml(s.text)}</span>
          <button class="subtask-delete" aria-label="Eliminar subtasca">×</button>
        </div>
      `).join('')}
      <div class="add-subtask">
        <input type="text" class="sub-input" placeholder="afegir subtasca..." />
      </div>
    </div>
  `;
  return li;
}

function renderLlista(tab) {
  if (tab === 'arxiu') return renderArxiu();
  const list = document.getElementById(`tasks-${tab}`);
  const empty = document.getElementById(`empty-${tab}`);
  const tasks = state.tasks[tab].filter(t => !isArchivedAge(t));

  list.innerHTML = '';
  if (tasks.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    const sorted = [...tasks].sort((a,b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const pOrder = { urgent: 0, setmana: 1, '': 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.createdAt - a.createdAt;
    });
    sorted.forEach(t => list.appendChild(renderTasca(t)));
  }

  const pendingCount = state.tasks[tab].filter(t => !t.done).length;
  document.getElementById(`count-${tab}`).textContent = pendingCount;
}

function renderArxiu() {
  const cat = state.arxiuSubTab;
  const list = document.getElementById('tasks-arxiu');
  const empty = document.getElementById('empty-arxiu');
  const tasks = state.tasks[cat].filter(t => isArchivedAge(t));

  document.querySelectorAll('.sub-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.arxiu === cat);
  });

  list.innerHTML = '';
  if (tasks.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    const sorted = [...tasks].sort((a,b) => b.doneAt - a.doneAt);
    sorted.forEach(t => list.appendChild(renderTasca(t)));
  }
}

function renderTot() {
  renderLlista('pro');
  renderLlista('personal');
  if (state.activeTab === 'arxiu') renderArxiu();

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === state.activeTab);
  });
  document.getElementById('list-pro').classList.toggle('hidden', state.activeTab !== 'pro');
  document.getElementById('list-personal').classList.toggle('hidden', state.activeTab !== 'personal');
  document.getElementById('list-arxiu').classList.toggle('hidden', state.activeTab !== 'arxiu');

  // Capçalera de columnes només a les llistes Pro/Personal (no a l'arxiu, que té sub-tabs a sobre)
  const colHeader = document.getElementById('col-header');
  colHeader.classList.toggle('hidden', state.activeTab === 'arxiu');

  document.querySelector('.composer').style.display = state.activeTab === 'arxiu' ? 'none' : 'block';
}

// ---------- ACCIONS ----------
function afegirTasca(text, meta = {}) {
  text = (text || '').trim();
  if (!text) return;
  const tab = state.activeTab === 'arxiu' ? state.arxiuSubTab : state.activeTab;

  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    text,
    done: false,
    createdAt: Date.now(),
    doneAt: null,
    deadline: meta.deadline !== undefined ? meta.deadline : state.composer.deadline,
    priority: meta.priority !== undefined ? meta.priority : state.composer.priority,
    remind: meta.remind !== undefined ? meta.remind : state.composer.remind,
    subtasks: []
  };
  state.tasks[tab].unshift(task);
  if (task.remind && task.deadline) programarRecordatori(task);

  state.composer = { deadline: null, priority: '', remind: false };
  actualitzaCompositorUI();

  save();
  renderTot();
  document.getElementById('task-input').value = '';
}

function toggleTask(id) {
  const f = findTask(id); if (!f) return;
  f.task.done = !f.task.done;
  f.task.doneAt = f.task.done ? Date.now() : null;
  save(); renderTot();
}

function deleteTask(id) {
  for (const cat of ['pro','personal']) {
    const before = state.tasks[cat].length;
    state.tasks[cat] = state.tasks[cat].filter(t => t.id !== id);
    if (state.tasks[cat].length !== before) { save(); renderTot(); return; }
  }
}

function editarTextTasca(id, nouText) {
  const f = findTask(id); if (!f) return;
  f.task.text = nouText.trim() || f.task.text;
  save();
}

function canviarDeadline(id, novaData) {
  const f = findTask(id); if (!f) return;
  f.task.deadline = novaData || null;
  save(); renderTot();
}

function ciclarPrioritat(id) {
  const f = findTask(id); if (!f) return;
  // urgent → setmana → '' (baixa) → urgent
  const cicle = { urgent: 'setmana', setmana: '', '': 'urgent' };
  f.task.priority = cicle[f.task.priority];
  save(); renderTot();
}

function afegirSubtasca(parentId, text) {
  text = text.trim(); if (!text) return;
  const f = findTask(parentId); if (!f) return;
  f.task.subtasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,4),
    text, done: false
  });
  save(); renderTot();
}

function toggleSubtasca(parentId, subId) {
  const f = findTask(parentId); if (!f) return;
  const s = f.task.subtasks.find(s => s.id === subId);
  if (s) { s.done = !s.done; save(); renderTot(); }
}

function eliminarSubtasca(parentId, subId) {
  const f = findTask(parentId); if (!f) return;
  f.task.subtasks = f.task.subtasks.filter(s => s.id !== subId);
  save(); renderTot();
}

function editarSubtasca(parentId, subId, nouText) {
  const f = findTask(parentId); if (!f) return;
  const s = f.task.subtasks.find(s => s.id === subId);
  if (s) { s.text = nouText.trim() || s.text; save(); }
}

function toggleExpandida(id) {
  expandedId = expandedId === id ? null : id;
  renderTot();
}

function switchTab(tab) {
  state.activeTab = tab;
  expandedId = null;
  save(); renderTot();
}

// ---------- COMPOSITOR ----------
function actualitzaCompositorUI() {
  const dChip = document.getElementById('deadline-chip');
  const dLabel = document.getElementById('deadline-label');
  const dInput = document.getElementById('deadline-input');

  if (state.composer.deadline) {
    dChip.classList.add('active');
    dLabel.textContent = fmtDeadlineCurt(state.composer.deadline);
    dInput.value = state.composer.deadline;
  } else {
    dChip.classList.remove('active');
    dLabel.textContent = 'Venciment';
    dInput.value = '';
  }

  const pChip = document.getElementById('priority-chip');
  const pLabel = document.getElementById('priority-label');
  const pDot = document.getElementById('priority-dot');
  pDot.className = 'priority-dot' + (state.composer.priority ? ' ' + state.composer.priority : ' baixa');
  if (state.composer.priority === 'urgent') { pChip.classList.add('active'); pLabel.textContent = 'Urgent'; }
  else if (state.composer.priority === 'setmana') { pChip.classList.add('active'); pLabel.textContent = 'Setmana'; }
  else { pChip.classList.remove('active'); pLabel.textContent = 'Prioritat'; }

  const remindToggle = document.getElementById('remind-toggle');
  const remindCheck = document.getElementById('remind-check');
  remindToggle.classList.toggle('visible', !!state.composer.deadline);
  remindCheck.checked = state.composer.remind;
}

// ---------- DICTAT amb pausa de silenci ----------
let recognition = null;
let isRecording = false;
let silenceTimer = null;
let lastTranscript = '';

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('mic-btn');

  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = 'Dictat no disponible en aquest navegador';
    micBtn.style.opacity = '0.35';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'ca-ES';
  recognition.continuous = true;   // important: deixa fer pauses
  recognition.interimResults = true;

  const input = document.getElementById('task-input');
  const status = document.getElementById('mic-status');
  let finalTranscript = '';

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    status.textContent = 'Escoltant…';
    status.classList.add('visible'); status.classList.remove('error');
    finalTranscript = '';
    lastTranscript = '';
    resetSilenceTimer();
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += transcript;
      else interim += transcript;
    }
    const current = (finalTranscript + interim).trim();
    input.value = current;

    // Si s'està detectant nou contingut, reiniciem el comptador
    if (current !== lastTranscript) {
      lastTranscript = current;
      resetSilenceTimer();
    }
  };

  recognition.onerror = (e) => {
    status.textContent = e.error === 'not-allowed' ? 'Permet el micro a Ajustos'
                       : e.error === 'no-speech' ? 'No s\'ha sentit res'
                       : 'Error de dictat';
    status.classList.add('error');
    setTimeout(() => status.classList.remove('visible','error'), 2500);
    stopRecording();
  };

  recognition.onend = async () => {
    clearTimeout(silenceTimer);
    const text = (lastTranscript || finalTranscript).trim();
    if (text) {
      input.value = text;
      const apiKey = getApiKey();
      if (apiKey) await interpretarAmbClaude(text, apiKey);
      else afegirTasca(text);
    }
    stopRecording();
  };
}

function resetSilenceTimer() {
  clearTimeout(silenceTimer);
  silenceTimer = setTimeout(() => {
    if (isRecording && recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  }, VOICE_SILENCE_MS);
}

function startRecording() {
  if (!recognition || isRecording) return;
  try { recognition.start(); } catch (e) { console.error(e); }
}

function stopRecording() {
  isRecording = false;
  clearTimeout(silenceTimer);
  document.getElementById('mic-btn').classList.remove('recording');
  setTimeout(() => document.getElementById('mic-status').classList.remove('visible'), 600);
}

// ---------- CLAUDE API ----------
function getApiKey() { return localStorage.getItem(API_KEY_STORAGE) || ''; }
function setApiKey(k) {
  if (k) localStorage.setItem(API_KEY_STORAGE, k);
  else localStorage.removeItem(API_KEY_STORAGE);
}

async function interpretarAmbClaude(text, apiKey) {
  const micBtn = document.getElementById('mic-btn');
  const status = document.getElementById('mic-status');
  micBtn.classList.add('processing');
  status.textContent = 'Interpretant…'; status.classList.add('visible');

  const avui = new Date();
  const dataAvui = avui.toISOString().split('T')[0];
  const diaAvui = DIES[avui.getDay()];

  const prompt = `Ets una assistent que extreu informació estructurada del dictat d'una tasca per a un empresari de restauració.

Avui és ${diaAvui}, ${dataAvui}.

Dictat: "${text}"

Retorna NOMÉS un JSON vàlid, sense markdown:
{
  "text": "text net de la tasca, sense la data ni la prioritat",
  "category": "pro" o "personal",
  "deadline": "YYYY-MM-DD" o null,
  "priority": "urgent" / "setmana" / "",
  "remind": true/false
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!resp.ok) throw new Error(`API ${resp.status}`);
    const data = await resp.json();
    const raw = data.content[0].text.trim();
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    if (parsed.category && ['pro','personal'].includes(parsed.category) && state.activeTab !== 'arxiu') {
      state.activeTab = parsed.category;
    }

    afegirTasca(parsed.text || text, {
      deadline: parsed.deadline || null,
      priority: parsed.priority || '',
      remind: !!parsed.remind
    });

    status.classList.remove('visible');
  } catch (e) {
    console.error('Error Claude:', e);
    status.textContent = 'Sense interpretació, tasca afegida en brut';
    setTimeout(() => status.classList.remove('visible'), 2500);
    afegirTasca(text);
  } finally {
    micBtn.classList.remove('processing');
  }
}

// ---------- NOTIFICACIONS ----------
async function demanarPermisNotificacions() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const p = await Notification.requestPermission();
  return p === 'granted';
}

function programarRecordatori(task) {
  if (!task.deadline) return;
  const [y,m,d] = task.deadline.split('-').map(Number);
  const data = new Date(y, m-1, d, 9, 0, 0);
  const avis = data.getTime() - 86400000;
  const delay = avis - Date.now();
  if (delay > 0 && delay < 2147483647) {
    setTimeout(() => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Secretària', {
          body: `Demà venç: ${task.text}`,
          icon: 'icon-192.png'
        });
      }
    }, delay);
  }
}

// ---------- INIT ----------
function init() {
  load();
  document.getElementById('today').textContent = fmtAvui(new Date());
  renderTot();
  actualitzaCompositorUI();
  initVoice();

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.querySelectorAll('.sub-tab').forEach(t => {
    t.addEventListener('click', () => {
      state.arxiuSubTab = t.dataset.arxiu;
      renderArxiu();
    });
  });

  document.getElementById('add-btn').addEventListener('click', () => {
    afegirTasca(document.getElementById('task-input').value);
  });
  document.getElementById('task-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); afegirTasca(e.target.value); }
  });

  document.getElementById('mic-btn').addEventListener('click', () => {
    if (isRecording) recognition.stop();
    else startRecording();
  });

  // Deadline al compositor
  document.getElementById('deadline-input').addEventListener('change', (e) => {
    state.composer.deadline = e.target.value || null;
    actualitzaCompositorUI();
  });

  // Priority chip
  const pChip = document.getElementById('priority-chip');
  const pPop = document.getElementById('priority-popover');
  pChip.addEventListener('click', (e) => {
    e.stopPropagation();
    const rect = pChip.getBoundingClientRect();
    pPop.style.left = rect.left + 'px';
    pPop.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
    pPop.classList.toggle('hidden');
  });
  document.querySelectorAll('.pop-item').forEach(item => {
    item.addEventListener('click', () => {
      state.composer.priority = item.dataset.priority;
      pPop.classList.add('hidden');
      actualitzaCompositorUI();
    });
  });
  document.addEventListener('click', () => pPop.classList.add('hidden'));

  document.getElementById('remind-check').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const ok = await demanarPermisNotificacions();
      if (!ok) { e.target.checked = false; return; }
    }
    state.composer.remind = e.target.checked;
  });

  // ----- DELEGACIÓ EVENTS A LA LLISTA -----
  document.querySelector('.main').addEventListener('click', (e) => {
    const taskEl = e.target.closest('.task');
    if (!taskEl) return;
    const id = taskEl.dataset.id;

    // Check principal
    if (e.target.classList.contains('task-check')) { toggleTask(id); return; }

    // Check de subtasca
    if (e.target.classList.contains('sub-check')) {
      const subId = e.target.closest('.subtask').dataset.subId;
      toggleSubtasca(id, subId);
      return;
    }

    // Eliminar tasca
    if (e.target.closest('.delete')) {
      if (confirm('Eliminar aquesta tasca?')) deleteTask(id);
      return;
    }

    // Eliminar subtasca
    if (e.target.classList.contains('subtask-delete')) {
      const subId = e.target.closest('.subtask').dataset.subId;
      eliminarSubtasca(id, subId);
      return;
    }

    // Cel·la prioritat → cicla
    const prioCell = e.target.closest('.prio-cell');
    if (prioCell) { ciclarPrioritat(id); return; }

    // Cel·la venciment → s'obre el date picker automàticament pel <input>
    // (no calen accions extra)

    // Toc al text quan no està en mode edició → expandir per veure tot el contingut
    if (e.target.classList.contains('task-text') && document.activeElement !== e.target) {
      // No toquem res - el contenteditable s'activa amb el toc
    }
  });

  // Doble toc al text o icona específica per expandir (mostrar meta + subtasques)
  document.querySelector('.main').addEventListener('dblclick', (e) => {
    const taskEl = e.target.closest('.task');
    if (!taskEl) return;
    if (e.target.classList.contains('task-text') || e.target.closest('.task-main')) {
      toggleExpandida(taskEl.dataset.id);
    }
  });

  // Canvi de venciment des de la cel·la
  document.querySelector('.main').addEventListener('change', (e) => {
    if (e.target.classList.contains('due-input')) {
      const taskEl = e.target.closest('.task');
      canviarDeadline(taskEl.dataset.id, e.target.value);
    }
  });

  // Edició inline (text tasca i subtasca)
  document.querySelector('.main').addEventListener('focusin', (e) => {
    const taskEl = e.target.closest('.task');
    if (!taskEl) return;
    const id = taskEl.dataset.id;

    if (e.target.classList.contains('task-text')) {
      const el = e.target;
      const handler = () => editarTextTasca(id, el.textContent);
      const keyHandler = (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
        if (ev.key === 'Escape') { ev.preventDefault(); el.blur(); }
      };
      el.addEventListener('blur', handler, { once: true });
      el.addEventListener('keydown', keyHandler);
    }

    if (e.target.classList.contains('subtask-text')) {
      const el = e.target;
      const subId = e.target.closest('.subtask').dataset.subId;
      const handler = () => editarSubtasca(id, subId, el.textContent);
      const keyHandler = (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
        if (ev.key === 'Escape') { ev.preventDefault(); el.blur(); }
      };
      el.addEventListener('blur', handler, { once: true });
      el.addEventListener('keydown', keyHandler);
    }
  });

  // Afegir subtasca amb Enter
  document.querySelector('.main').addEventListener('keydown', (e) => {
    if (e.target.classList.contains('sub-input') && e.key === 'Enter') {
      e.preventDefault();
      const taskEl = e.target.closest('.task');
      afegirSubtasca(taskEl.dataset.id, e.target.value);
      e.target.value = '';
    }
  });

  // Configuració
  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('api-key-input').value = getApiKey();
    settingsModal.classList.remove('hidden');
  });
  document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.add('hidden'));
  document.getElementById('save-settings').addEventListener('click', () => {
    setApiKey(document.getElementById('api-key-input').value.trim());
    settingsModal.classList.add('hidden');
  });
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
  });

  // Reprogramar recordatoris pendents
  ['pro','personal'].forEach(cat => {
    state.tasks[cat].forEach(t => {
      if (!t.done && t.remind && t.deadline) programarRecordatori(t);
    });
  });

  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
