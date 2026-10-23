/** Review view — confirm extracted tasks before saving to IndexedDB */
import { state }                 from '../state.js';
import { esc, uid, toast, modal, closeModal, rerender } from '../utils.js';
import { savePlan }              from '../sync.js';

const CAT_LABELS = {
  medication: '💊 Medicamento',
  followup:   '🏥 Retorno',
  monitoring: '📊 Monitorar',
  care:       '✨ Cuidado',
};

function taskEditCard(task, idx) {
  const needsConfirm = task.needsReview && !task.confirmed;
  return `
    <article class="card task-edit">
      <div class="task-category ${task.category ? 'cat-' + task.category : 'cat-care'}" style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:8px;font-size:10px;font-weight:700;margin-bottom:8px">
        ${CAT_LABELS[task.category] || '✨ Cuidado'}
      </div>
      <h3>${esc(task.title)}</h3>
      <p>${esc(task.details)}</p>
      <small style="color:#8a9d96;display:block;margin-top:6px">${esc(task.time)}${task.frequency ? ' · ' + esc(task.frequency) : ''}</small>
      <footer>
        <button class="btn-ghost" data-edit-task="${idx}">✏ Editar e confirmar</button>
        <span class="badge ${needsConfirm ? 'badge-warn' : 'badge-ok'}">
          ${needsConfirm ? '! confirmar com papel' : '✓ confirmado'}
        </span>
      </footer>
    </article>`;
}

export function html() {
  const d = state.draft;
  if (!d) { location.hash = 'add'; return ''; }

  const safetyHtml = d.safety.length
    ? `<div class="safety-card">
         <h3>⚠ Atenção — procure ajuda agora</h3>
         <p>A orientação menciona: "<em>${esc(d.safety.join('; '))}</em>".<br>
            Procure a clínica ou agente comunitário imediatamente.</p>
       </div>` : '';

  const warnHtml = d.uncertainties.length
    ? `<div class="notice warning">⚑ Incertezas: ${esc(d.uncertainties.join(' | '))}</div>` : '';

  return `
    <section>
      <span class="eyebrow">Revisão antes de salvar</span>
      <h1 class="view-title">Este é o seu plano.</h1>
      <p class="lead">Confirme os itens amarelos com o papel ou com o agente de saúde. Eles não podem ser salvos sem confirmação.</p>

      ${safetyHtml}

      <div class="card plan-summary">
        <span class="badge badge-ok" style="margin-bottom:10px">✓ Extraído localmente</span>
        <h2>${d.tasks.length} tarefa(s) encontrada(s)</h2>
        <div class="source-quote">"${esc(d.source.slice(0, 180))}${d.source.length > 180 ? '…' : ''}"</div>
        ${d.image ? '<small style="color:var(--muted);font-size:12px;margin-top:8px;display:block">📷 Foto original anexada ao plano.</small>' : ''}
      </div>

      ${d.tasks.map((t, i) => taskEditCard(t, i)).join('')}

      ${warnHtml}

      <button class="btn-primary" id="save-plan-btn">Salvar plano de cuidado</button>
      <button class="btn-secondary btn-full" id="redo-btn">← Editar orientação</button>
    </section>`;
}

export function bind() {
  document.querySelectorAll('[data-edit-task]').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(Number(btn.dataset.editTask))));

  document.getElementById('save-plan-btn')?.addEventListener('click', handleSave);
  document.getElementById('redo-btn')?.addEventListener('click', () => { location.hash = 'add'; });
}

function openEditModal(idx) {
  const task = state.draft?.tasks[idx];
  if (!task) return;
  modal('Confirmar tarefa', `
    <p>Edite <strong>apenas</strong> para refletir o que está no papel. Noor não sugere doses.</p>
    <label class="input-label" for="et-title">Título</label>
    <input id="et-title" class="text-input compact" value="${esc(task.title)}" />
    <label class="input-label" for="et-details">Texto da orientação</label>
    <textarea id="et-details" class="text-input compact">${esc(task.details)}</textarea>
    <label class="input-label" for="et-date">Data do cuidado</label>
    <input id="et-date" type="date" class="text-input compact" value="${esc(task.date)}" />
    <label class="input-label" for="et-time">Horário ou frequência</label>
    <input id="et-time" class="text-input compact" value="${esc(task.time)}" />
    <button class="btn-primary" id="confirm-task-btn">Confirmar tarefa</button>`);

  document.getElementById('confirm-task-btn').addEventListener('click', () => {
    task.title      = document.getElementById('et-title').value.trim()   || task.title;
    task.details    = document.getElementById('et-details').value.trim() || task.details;
    task.date       = document.getElementById('et-date').value           || task.date;
    task.time       = document.getElementById('et-time').value.trim()    || 'Conforme orientação';
    task.confirmed  = true;
    task.needsReview = false;
    closeModal();
    rerender();
  });
}

async function handleSave() {
  const d = state.draft;
  if (!d) return;
  const unconfirmed = d.tasks.filter(t => t.needsReview && !t.confirmed);
  if (unconfirmed.length) return toast('Confirme os itens amarelos antes de salvar.');

  const plan = { id: uid(), createdAt: Date.now(), ...d };
  await savePlan(plan, 'plan');
  state.draft = null;
  state.imageData = null;
  state.audioBlob = null;
  toast('✓ Plano salvo offline.');
  location.hash = 'home';
}
