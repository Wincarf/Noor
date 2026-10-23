/** Home view — daily task list, sync strip, report modal */
import { state }               from '../state.js';
import { esc, uid, todayKey, todayFull, greeting, toast, modal, closeModal, tidy, urgent, rerender } from '../utils.js';
import { dbPut }               from '../db.js';
import { savePlan, syncNow, waitingCount } from '../sync.js';
import { speak, startRecording, stopRecording, isRecording } from '../audio.js';
import { enqueue }             from '../sync.js';

const CAT = {
  medication: { emoji: '💊', label: 'Medicamento', css: 'cat-medication' },
  followup:   { emoji: '🏥', label: 'Retorno',     css: 'cat-followup'   },
  monitoring: { emoji: '📊', label: 'Monitorar',   css: 'cat-monitoring' },
  care:       { emoji: '✨', label: 'Cuidado',     css: 'cat-care'       },
};

function taskCard(task, planId) {
  const cat = CAT[task.category] || CAT.care;
  return `
    <article class="card task-card${task.done ? ' done' : ''}" id="tc-${task.id}">
      <button class="check-btn${task.done ? ' checked' : ''}"
              data-done="${planId}:${task.id}"
              aria-label="${task.done ? 'Desmarcar' : 'Marcar como concluída'}"
              aria-pressed="${task.done}">
        ${task.done ? '✓' : ''}
      </button>
      <div class="task-copy">
        <span class="task-category ${cat.css}">${cat.emoji} ${cat.label}</span>
        <h3>${esc(task.title)}${task.needsReview && !task.confirmed ? ' <span class="tiny-warning">confirmar</span>' : ''}</h3>
        <p>${esc(task.details)}</p>
        <small>${esc(task.date)}${task.frequency ? ' · ' + esc(task.frequency) : ''}</small>
      </div>
      <span class="task-time">${esc(task.time)}</span>
    </article>`;
}

export function html() {
  const allTasks    = state.plans.flatMap(p => p.tasks.map(t => ({ ...t, planId: p.id })));
  const pendingToday = allTasks.filter(t => !t.done && t.date <= todayKey());
  const doneCount   = allTasks.filter(t => t.done).length;
  const pending     = waitingCount();

  return `
    <section class="hero">
      <span class="eyebrow">Seu plano de cuidado</span>
      <h1>${greeting()}, Noor.</h1>
      <p>Vamos cuidar de hoje, passo a passo.</p>
    </section>

    <div class="date-strip">
      <strong>${todayFull()}</strong>
      <span class="progress-badge">${doneCount}/${allTasks.length} concluídas ✓</span>
    </div>

    <div class="sync-strip${pending ? ' pending' : ''}">
      <span>${pending ? `↑ ${pending} registro(s) aguardando sinal` : '✓ Registros sincronizados'}</span>
      <button id="sync-btn">Sincronizar agora</button>
    </div>

    <section aria-label="Tarefas de hoje">
      ${pendingToday.length
        ? pendingToday.map(t => taskCard(t, t.planId)).join('')
        : `<div class="card card-empty">
             <span class="empty-icon">🌿</span>
             Nenhuma tarefa pendente para hoje.<br>Você está em dia!
           </div>`}
    </section>

    <div class="help-card">
      <span class="help-icon">🎙</span>
      <div>
        <h3>Teve alguma dificuldade?</h3>
        <p>Registre texto ou áudio para o agente de saúde.</p>
      </div>
    </div>
    <button class="btn-primary" id="report-btn">Registrar dificuldade</button>`;
}

export function bind() {
  document.querySelectorAll('[data-done]').forEach(btn =>
    btn.addEventListener('click', () => toggleDone(btn.dataset.done)));

  document.getElementById('sync-btn')?.addEventListener('click', async () => {
    await syncNow();
  });

  document.getElementById('report-btn')?.addEventListener('click', openReportModal);
}

async function toggleDone(ref) {
  const [planId, taskId] = ref.split(':');
  const plan = state.plans.find(p => p.id === planId);
  const task = plan?.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.done = !task.done;
  await savePlan(plan, 'completion');
  if (task.done && state.settings.audio) speak('Tarefa concluída.');
  rerender();
}

function openReportModal() {
  modal('Registrar dificuldade', `
    <p>O relato fica salvo neste aparelho e só é enviado com sua autorização.<br>
    <strong>Noor não oferece diagnóstico.</strong></p>
    <label class="input-label" for="report-cat">Tipo de dificuldade</label>
    <select id="report-cat" class="select-input">
      <option>Medicamento acabou</option>
      <option>Sintoma ou mal-estar</option>
      <option>Dúvida sobre orientação</option>
      <option>Outro</option>
    </select>
    <label class="input-label" for="report-text">Descreva o que aconteceu</label>
    <textarea id="report-text" class="text-input compact"
              placeholder="Ex.: Senti tontura depois de tomar o remédio às 8h." rows="4"></textarea>
    <div class="audio-row">
      <button class="btn-secondary" id="rep-audio-btn">🎙 Gravar áudio</button>
      <span id="rep-audio-state" class="audio-state"></span>
    </div>
    <button class="btn-primary" id="save-rep-btn">Guardar relato offline</button>`);

  document.getElementById('rep-audio-btn').addEventListener('click', () => {
    const btn = document.getElementById('rep-audio-btn');
    const lbl = document.getElementById('rep-audio-state');
    if (isRecording()) {
      stopRecording();
      btn.textContent = '🎙 Gravar áudio';
      lbl.textContent = '';
    } else {
      startRecording(blob => {
        state.audioBlob = blob;
        lbl.textContent = '✓ Áudio anexado';
      });
      btn.innerHTML = '<span class="recording-indicator"><span class="recording-dot"></span> Gravando…</span>';
      toast('Toque novamente para parar.');
    }
  });

  document.getElementById('save-rep-btn').addEventListener('click', saveReport);
}

async function saveReport() {
  const text = tidy(document.getElementById('report-text').value);
  if (!text && !state.audioBlob) return toast('Descreva ou grave o que aconteceu.');

  const report = {
    id:        uid(),
    text,
    category:  document.getElementById('report-cat').value,
    audio:     state.audioBlob || null,
    createdAt: Date.now(),
    urgent:    urgent(text),
    status:    'queued',
  };

  await dbPut('reports', report);
  state.reports.unshift(report);
  await enqueue('report', report.id, report.urgent ? 'Relato urgente' : 'Dificuldade registrada');
  state.audioBlob = null;
  closeModal();

  if (report.urgent) {
    modal('⚠ Procure ajuda agora', `
      <div class="safety-card" style="margin:0">
        <h3>⚠ Situação de atenção</h3>
        <p>Este relato pode indicar uma situação urgente.<br>
           Procure a clínica ou agente comunitário <strong>imediatamente</strong>.<br>
           O relato foi salvo e está na fila de envio.</p>
      </div>`);
  } else {
    toast('✓ Relato guardado offline para o agente de saúde.');
  }
  rerender();
}
