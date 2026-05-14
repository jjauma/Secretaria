// ============================================
// SECRETARIA — Fase 1
// Captura por texto y voz, persistencia local
// ============================================

const STORAGE_KEY = 'secretaria_v1';

// Estado
let state = {
  activeTab: 'pro',
  tasks: { pro: [], personal: [] }
};

// ---------- PERSISTENCIA ----------
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('No se pudo guardar:', e);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.tasks) state.tasks = parsed.tasks;
      if (parsed.activeTab) state.activeTab = parsed.activeTab;
    }
  } catch (e) {
    console.error('No se pudo cargar:', e);
  }
}

// ---------- RENDER ----------
function formatDate(d) {
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
}

function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  if (sameDay) return `Hoy, ${hh}:${mm}`;
  const dd = String(d.getDate()).padStart(2,'0');
  const mo = String(d.getMonth()+1).padStart(2,'0');
  return `${dd}/${mo}, ${hh}:${mm}`;
}

function renderTasks(tab) {
  const list = document.getElementById(`tasks-${tab}`);
  const empty = document.getElementById(`empty-${tab}`);
  const tasks = state.tasks[tab];

  list.innerHTML = '';

  if (tasks.length === 0) {
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    // Pendientes primero, luego hechas
    const sorted = [...tasks].sort((a,b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return b.createdAt - a.createdAt;
    });

    sorted.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');
      li.innerHTML = `
        <input type="checkbox" class="check" ${task.done ? 'checked' : ''} data-id="${task.id}" aria-label="Marcar como hecha" />
        <div class="task-text">
          ${escapeHtml(task.text)}
          <span class="task-time">${formatTime(task.createdAt)}</span>
        </div>
        <button class="delete" data-id="${task.id}" aria-label="Eliminar">×</button>
      `;
      list.appendChild(li);
    });
  }

  // Contador (solo pendientes)
  const pendingCount = tasks.filter(t => !t.done).length;
  document.getElementById(`count-${tab}`).textContent = pendingCount;
}

function renderAll() {
  renderTasks('pro');
  renderTasks('personal');
  // Mostrar tab activa
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === state.activeTab);
  });
  document.getElementById('list-pro').classList.toggle('hidden', state.activeTab !== 'pro');
  document.getElementById('list-personal').classList.toggle('hidden', state.activeTab !== 'personal');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- ACCIONES ----------
function addTask(text) {
  text = text.trim();
  if (!text) return;
  const task = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    text,
    done: false,
    createdAt: Date.now()
  };
  state.tasks[state.activeTab].unshift(task);
  save();
  renderTasks(state.activeTab);
  document.getElementById('task-input').value = '';
}

function toggleTask(id) {
  const list = state.tasks[state.activeTab];
  const task = list.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    save();
    renderTasks(state.activeTab);
  }
}

function deleteTask(id) {
  state.tasks[state.activeTab] = state.tasks[state.activeTab].filter(t => t.id !== id);
  save();
  renderTasks(state.activeTab);
}

function switchTab(tab) {
  state.activeTab = tab;
  save();
  renderAll();
}

// ---------- DICTADO POR VOZ ----------
let recognition = null;
let isRecording = false;

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('mic-btn');

  if (!SpeechRecognition) {
    micBtn.disabled = true;
    micBtn.title = 'Dictado no disponible en este navegador';
    micBtn.style.opacity = '0.35';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = false;
  recognition.interimResults = true;

  const input = document.getElementById('task-input');
  const status = document.getElementById('mic-status');
  let finalTranscript = '';

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    status.textContent = 'Escuchando…';
    status.classList.add('visible');
    finalTranscript = '';
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interim += transcript;
      }
    }
    input.value = finalTranscript + interim;
  };

  recognition.onerror = (e) => {
    status.textContent = e.error === 'not-allowed'
      ? 'Permite el micro en Ajustes'
      : 'Error de dictado';
    setTimeout(() => status.classList.remove('visible'), 2500);
    stopRecording();
  };

  recognition.onend = () => {
    if (finalTranscript.trim()) {
      input.value = finalTranscript.trim();
      // Añadir automáticamente al terminar el dictado
      addTask(input.value);
    }
    stopRecording();
  };
}

function startRecording() {
  if (!recognition || isRecording) return;
  try {
    recognition.start();
  } catch (e) {
    console.error(e);
  }
}

function stopRecording() {
  isRecording = false;
  document.getElementById('mic-btn').classList.remove('recording');
  setTimeout(() => {
    document.getElementById('mic-status').classList.remove('visible');
  }, 600);
}

// ---------- INIT ----------
function init() {
  load();
  document.getElementById('today').textContent = formatDate(new Date());
  renderAll();
  initVoice();

  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Añadir tarea
  document.getElementById('add-btn').addEventListener('click', () => {
    addTask(document.getElementById('task-input').value);
  });

  document.getElementById('task-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask(e.target.value);
    }
  });

  // Mic
  document.getElementById('mic-btn').addEventListener('click', () => {
    if (isRecording) {
      recognition.stop();
    } else {
      startRecording();
    }
  });

  // Delegación de eventos en las listas
  document.querySelectorAll('.task-list').forEach(list => {
    list.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains('check')) toggleTask(id);
      if (e.target.classList.contains('delete')) {
        if (confirm('¿Eliminar esta tarea?')) deleteTask(id);
      }
    });
  });

  // Service worker para PWA (modo offline)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
