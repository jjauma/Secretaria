// ============================================
// SECRETÀRIA — Fase 1.5
// ============================================

const STORAGE_KEY = 'secretaria_v2';
const API_KEY_STORAGE = 'secretaria_apikey';
const ARCHIVE_DAYS = 7;

// ---------- ESTAT ----------
let state = {
  activeTab: 'pro',
  arxiuSubTab: 'pro',
  tasks: { pro: [], personal: [] },
  // Metadades del compositor abans d'afegir
  composer: { deadline: null, priority: '', remind: false }
};

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
      // Migració: assegurar camps nous
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

function fmtDeadline(iso) {
  const [y,m,dd] = iso.split('-').map(Number);
  const d = new Date(y, m-1, dd);
  const avui = new Date(); avui.setHours(0,0,0,0);
  const diff = Math.round((d - avui) / 86400000);
  if (diff === 0) return 'avui';
  if (diff === 1) return 'demà';
  if (diff === -1) return 'ahir';
  if (diff > 1 && diff < 7) return DIES[d.getDay()];
  return `${d.getDate()} ${MESOS[d.getMonth()].slice(0,3)}`;
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

// ---------- RENDER ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isArchivedAge(task) {
  if (!task.done || !task.doneAt) return false;
  return (Date.now() - task.doneAt) > ARCHIVE_DAYS * 86400000;
}

function renderTasca(task, isArxiu = false) {
  const li = document.createElement('li');
  li.className = 'task' + (task.done ? ' done' : '') +
    (task.priority ? ` priority-${task.priority}` : '');
  li.dataset.id = task.id;

  const totalSub = task.subtasks.length;
  const doneSub = task.subtasks.filter(s => s.done).length;

  // Meta tags
  const metaTags = [];
  metaTags.push(`<span class="meta-tag">creada ${fmtDataCurta(task.createdAt)}</span>`);
  if (task.deadline && !task.done) {
    const status = deadlineStatus(task.deadline);
    const cls = status === 'late' ? 'deadline-late' : (status === 'soon' ? 'deadline-soon' : '');
    metaTags.push(`<span class="meta-tag ${cls}">· venç ${fmtDeadline(task.deadline)}</span>`);
  }
  if (task.done && task.doneAt) {
    metaTags.push(`<span class="meta-tag done-tag">· feta ${fmtDataCurta(task.doneAt)}</span>`);
  }

  const subCountHtml = totalSub > 0
    ? `<span class="subtask-count">${doneSub}/${totalSub}</span>` : '';

  li.innerHTML = `
    <div class="task-main">
      <input type="checkbox" class="check task-check" ${task.done ? 'checked' : ''} aria-label="Marca com a feta" />
      <div class="task-content">
        <div class="task-text" contenteditable="true" spellcheck="false">${escapeHtml(task.text)}</div>
        <div class="task-meta">${metaTags.join('')}</div>
      </div>
      <div class="task-actions">
        ${subCountHtml}
        <button class="icon-btn toggle-subs" aria-label="Subtasques" title="Subtasques">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="icon-btn delete" aria-label="Eliminar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="subtasks" style="display:none">
      ${task.subtasks.map(s => `
        <div class="subtask ${s.done ? 'done' : ''}" data-sub-id="${s.id}">
          <input type="checkbox" class="check sub-check" ${s.done ? 'checked' : ''} />
          <span class="subtask-text" contenteditable="true" spellcheck="false">${escapeHtml(s.text)}</span>
          <button class="subtask-delete" aria-label="Eliminar subtasca">×</button>
        </div>
      `).join('')}
      <div class="add-subtask">
        <input type="text" class="sub-input" placeholder="Afegir subtasca..." />
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
      // Prioritat
      const pOrder = { urgent: 0, setmana: 1, '': 2 };
      if (pOrder[a.priority] !== pOrder[b.priority]) return pOrder[a.priority] - pOrder[b.priority];
      // Deadline més proper primer
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return b.createdAt - a.createdAt;
    });
    sorted.forEach(t => list.appendChild(renderTasca(t)));
  }

  // Comptador (només pendents)
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
    sorted.forEach(t => list.appendChild(renderTasca(t, true)));
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

  // Compositor només a Pro/Personal
  document.querySelector('.composer').style.display = state.activeTab === 'arxiu' ? 'none' : 'block';
}

// ---------- ACCIONS ----------
function afegirTasca(text, meta = {}) {
  text = (text || '').trim();
  if (!text) return;
  // No es poden afegir a Arxiu
  const tab = state.activeTab === 'arxiu' ? state.arxiuSubTab : state.activeTab;

  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    text,
    done: false,
    createdAt: Date.now(),
    doneAt: null,
    deadline: meta.deadline || state.composer.deadline,
    priority: meta.priority || state.composer.priority,
    remind: meta.remind !== undefined ? meta.remind : state.composer.remind,
    subtasks: []
  };
  state.tasks[tab].unshift(task);

  // Programar recordatori
  if (task.remind && task.deadline) programarRecordatori(task);

  // Reset compositor
  state.composer = { deadline: null, priority: '', remind: false };
  actualitzaCompositorUI();

  save();
  renderTot();
  document.getElementById('task-input').value = '';
}

function toggleTask(id) {
  for (const cat of ['pro','personal']) {
    const t = state.tasks[cat].find(x => x.id === id);
    if (t) {
      t.done = !t.done;
      t.doneAt = t.done ? Date.now() : null;
      save();
      renderTot();
      return;
    }
  }
}

function deleteTask(id) {
  for (const cat of ['pro','personal']) {
    const before = state.tasks[cat].length;
    state.tasks[cat] = state.tasks[cat].filter(t => t.id !== id);
    if (state.tasks[cat].length !== before) { save(); renderTot(); return; }
  }
}

function editarTextTasca(id, nouText) {
  for (const cat of ['pro','personal']) {
    const t = state.tasks[cat].find(x => x.id === id);
    if (t) { t.text = nouText.trim() || t.text; save(); return; }
  }
}

function afegirSubtasca(parentId, text) {
  text = text.trim(); if (!text) return;
  for (const cat of ['pro','personal']) {
    const t = state.tasks[cat].find(x => x.id === parentId);
    if (t) {
      t.subtasks.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,4),
        text, done: false
      });
      save(); renderTot();
      // Mantenir obert
      const li = document.querySelector(`.task[data-id="${parentId}"]`);
      if (li) li.querySelector('.subtasks').style.display = 'block';
      return;
    }
  }
}

function toggleSubtasca(parentId, subId) {
  for (const cat of ['pro','personal']) {
    const t = state.tasks[cat].find(x => x.id === parentId);
    if (t) {
      const s = t.subtasks.find(s => s.id === subId);
      if (s) { s.done = !s.done; save(); renderTot();
        const li = document.querySelector(`.task[data-id="${parentId}"]`);
        if (li) li.querySelector('.subtasks').style.display = 'block';
      }
      return;
    }
  }
}

function eliminarSubtasca(parentId, subId) {
  for (const cat of ['pro','personal']) {
    const t = state.tasks[cat].find(x => x.id === parentId);
    if (t) {
      t.subtasks = t.subtasks.filter(s => s.id !== subId);
      save(); renderTot();
      const li = document.querySelector(`.task[data-id="${parentId}"]`);
      if (li) li.querySelector('.subtasks').style.display = 'block';
      return;
    }
  }
}

function editarSubtasca(parentId, subId, nouText) {
  for (const cat of ['pro','personal']) {
    const t = state.tasks[cat].find(x => x.id === parentId);
    if (t) {
      const s = t.subtasks.find(s => s.id === subId);
      if (s) { s.text = nouText.trim() || s.text; save(); }
      return;
    }
  }
}

function switchTab(tab) {
  state.activeTab = tab;
  save(); renderTot();
}

// ---------- COMPOSITOR (chips) ----------
function actualitzaCompositorUI() {
  const dChip = document.getElementById('deadline-chip');
  const dLabel = document.getElementById('deadline-label');
  const dInput = document.getElementById('deadline-input');

  if (state.composer.deadline) {
    dChip.classList.add('active');
    dLabel.textContent = fmtDeadline(state.composer.deadline);
    dInput.value = state.composer.deadline;
  } else {
    dChip.classList.remove('active');
    dLabel.textContent = 'Venciment';
    dInput.value = '';
  }

  const pChip = document.getElementById('priority-chip');
  const pLabel = document.getElementById('priority-label');
  const pDot = document.getElementById('priority-dot');
  pDot.className = 'priority-dot' + (state.composer.priority ? ' ' + state.composer.priority : '');
  if (state.composer.priority === 'urgent') { pChip.classList.add('active'); pLabel.textContent = 'Urgent'; }
  else if (state.composer.priority === 'setmana') { pChip.classList.add('active'); pLabel.textContent = 'Setmana'; }
  else { pChip.classList.remove('active'); pLabel.textContent = 'Prioritat'; }

  // Toggle "Avisa'm" visible només si hi ha deadline
  const remindToggle = document.getElementById('remind-toggle');
  const remindCheck = document.getElementById('remind-check');
  remindToggle.classList.toggle('visible', !!state.composer.deadline);
  remindCheck.checked = state.composer.remind;
}

// ---------- DICTAT ----------
let recognition = null;
let isRecording = false;

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
  recognition.continuous = false;
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
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) finalTranscript += transcript;
      else interim += transcript;
    }
    input.value = finalTranscript + interim;
  };

  recognition.onerror = (e) => {
    status.textContent = e.error === 'not-allowed' ? 'Permet el micro a Ajustos' : 'Error de dictat';
    status.classList.add('error');
    setTimeout(() => status.classList.remove('visible','error'), 2500);
    stopRecording();
  };

  recognition.onend = async () => {
    const text = finalTranscript.trim();
    if (text) {
      input.value = text;
      // Si tenim API key, interpretem amb Claude
      const apiKey = getApiKey();
      if (apiKey) {
        await interpretarAmbClaude(text, apiKey);
      } else {
        afegirTasca(text);
      }
    }
    stopRecording();
  };
}

function startRecording() {
  if (!recognition || isRecording) return;
  try { recognition.start(); } catch (e) { console.error(e); }
}

function stopRecording() {
  isRecording = false;
  document.getElementById('mic-btn').classList.remove('recording');
  setTimeout(() => document.getElementById('mic-status').classList.remove('visible'), 600);
}

// ---------- INTEGRACIÓ CLAUDE API ----------
function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}
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

Retorna NOMÉS un JSON vàlid amb aquesta estructura, sense cap text addicional ni markdown:
{
  "text": "text net de la tasca, sense la data ni la prioritat",
  "category": "pro" o "personal" (pro si parla de feina/restaurants/proveïdors/empleats/finances/admin; personal si parla de família/casa/oci/salut)",
  "deadline": "YYYY-MM-DD" o null (interpreta 'demà', 'dilluns', 'aquest cap de setmana', etc.),
  "priority": "urgent" si diu urgent/avui/de pressa, "setmana" si diu aquesta setmana o similar, "" altrament,
  "remind": true si demana recordatori, false altrament
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
    // Treure possibles fences
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    // Si la categoria suggerida no coincideix amb la pestanya activa, canviem
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
  const avis = data.getTime() - 86400000; // 1 dia abans a les 9h
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

// ---------- EDICIÓ INLINE ----------
function ferEditable(el, onSave) {
  el.addEventListener('focus', () => {
    document.execCommand('selectAll', false, null);
  });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { e.preventDefault(); el.blur(); }
  });
  el.addEventListener('blur', () => {
    onSave(el.textContent);
  });
}

// ---------- INIT ----------
function init() {
  load();
  document.getElementById('today').textContent = fmtAvui(new Date());
  renderTot();
  actualitzaCompositorUI();
  initVoice();

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.querySelectorAll('.sub-tab').forEach(t => {
    t.addEventListener('click', () => {
      state.arxiuSubTab = t.dataset.arxiu;
      renderArxiu();
    });
  });

  // Afegir tasca
  document.getElementById('add-btn').addEventListener('click', () => {
    afegirTasca(document.getElementById('task-input').value);
  });
  document.getElementById('task-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); afegirTasca(e.target.value); }
  });

  // Micro
  document.getElementById('mic-btn').addEventListener('click', () => {
    if (isRecording) recognition.stop();
    else startRecording();
  });

  // Deadline chip
  const dInput = document.getElementById('deadline-input');
  dInput.addEventListener('change', (e) => {
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

  // Remind toggle
  document.getElementById('remind-check').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const ok = await demanarPermisNotificacions();
      if (!ok) { e.target.checked = false; return; }
    }
    state.composer.remind = e.target.checked;
  });

  // Delegació d'events a les llistes
  document.querySelector('.main').addEventListener('click', (e) => {
    const taskEl = e.target.closest('.task');
    if (!taskEl) return;
    const id = taskEl.dataset.id;

    if (e.target.classList.contains('task-check')) { toggleTask(id); return; }

    if (e.target.closest('.delete')) {
      if (confirm('Eliminar aquesta tasca?')) deleteTask(id);
      return;
    }

    if (e.target.closest('.toggle-subs')) {
      const subs = taskEl.querySelector('.subtasks');
      subs.style.display = subs.style.display === 'block' ? 'none' : 'block';
      return;
    }

    if (e.target.classList.contains('sub-check')) {
      const subId = e.target.closest('.subtask').dataset.subId;
      toggleSubtasca(id, subId);
      return;
    }

    if (e.target.classList.contains('subtask-delete')) {
      const subId = e.target.closest('.subtask').dataset.subId;
      eliminarSubtasca(id, subId);
      return;
    }
  });

  // Edició inline (delegació amb focusin)
  document.querySelector('.main').addEventListener('focusin', (e) => {
    const taskEl = e.target.closest('.task');
    if (!taskEl) return;
    const id = taskEl.dataset.id;

    if (e.target.classList.contains('task-text')) {
      const el = e.target;
      const handler = () => { editarTextTasca(id, el.textContent); el.removeEventListener('blur', handler); };
      const keyHandler = (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
        if (ev.key === 'Escape') { ev.preventDefault(); el.blur(); }
      };
      el.addEventListener('blur', handler, { once: true });
      el.addEventListener('keydown', keyHandler, { once: false });
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

  // Afegir subtasca
  document.querySelector('.main').addEventListener('keydown', (e) => {
    if (e.target.classList.contains('sub-input') && e.key === 'Enter') {
      e.preventDefault();
      const taskEl = e.target.closest('.task');
      afegirSubtasca(taskEl.dataset.id, e.target.value);
      e.target.value = '';
    }
  });

  // Configuració (API key)
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
