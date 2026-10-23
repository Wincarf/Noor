/** History view — saved plans and difficulty reports */
import { state }            from '../state.js';
import { esc, stamp, modal } from '../utils.js';

const CAT_EMOJI = { medication: '💊', followup: '🏥', monitoring: '📊', care: '✨' };

function reportCard(r) {
  const badge = r.urgent ? 'badge-danger'
    : r.status === 'synced' ? 'badge-synced' : 'badge-queued';
  const label = r.urgent ? '⚠ atenção urgente'
    : r.status === 'synced' ? '✓ sincronizado' : '⏳ aguardando sinal';
  return `
    <article class="card task-edit">
      <h3>${stamp(r.createdAt)} · ${esc(r.category)}</h3>
      <p>${esc(r.text || 'Relato em áudio — sem transcrição de texto.')}</p>
      <footer><span class="badge ${badge}">${label}</span></footer>
    </article>`;
}

function planCard(p) {
  const done  = p.tasks.filter(t => t.done).length;
  const total = p.tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
  return `
    <article class="card task-edit">
      <h3>${stamp(p.createdAt)} · ${total} tarefa(s)</h3>
      <p>${esc(p.source.slice(0, 120))}${p.source.length > 120 ? '…' : ''}</p>
      <div style="margin:8px 0 4px;background:var(--line);border-radius:6px;height:6px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:var(--green);transition:width .4s"></div>
      </div>
      <footer>
        <span class="badge badge-ok">${done}/${total} concluídas</span>
        <button class="btn-ghost" data-open-plan="${p.id}">Ver tarefas →</button>
      </footer>
    </article>`;
}

export function html() {
  const reports = state.reports.length
    ? state.reports.map(reportCard).join('')
    : `<div class="card card-empty"><span class="empty-icon">📋</span>Nenhuma dificuldade registrada ainda.</div>`;

  const plans = state.plans.length
    ? state.plans.map(planCard).join('')
    : `<div class="card card-empty"><span class="empty-icon">🗂</span>Seu histórico de planos aparecerá aqui.</div>`;

  return `
    <section>
      <span class="eyebrow">Seu registro</span>
      <h1 class="view-title">Histórico de cuidado</h1>
      <p class="lead">Planos e relatos ficam guardados neste aparelho.</p>

      <div class="section-head"><h2>Relatos enviados à fila</h2></div>
      ${reports}

      <div class="section-head"><h2>Planos salvos</h2></div>
      ${plans}
    </section>`;
}

export function bind() {
  document.querySelectorAll('[data-open-plan]').forEach(btn =>
    btn.addEventListener('click', () => openPlanModal(btn.dataset.openPlan)));
}

function openPlanModal(planId) {
  const plan = state.plans.find(p => p.id === planId);
  if (!plan) return;

  const imgHtml = plan.image
    ? `<img src="${plan.image}" class="plan-image" alt="Foto da orientação original" />`
    : '';

  const tasksHtml = plan.tasks.map(t => `
    <div style="padding:12px 0;border-bottom:1px solid var(--line)">
      <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--muted)">
        ${CAT_EMOJI[t.category] || '✨'} ${t.category || 'cuidado'}
      </span>
      <p style="margin:4px 0 2px;font-weight:700;font-size:14px">${esc(t.title)}</p>
      <p style="margin:0;color:var(--muted);font-size:13px;line-height:1.4">${esc(t.details)}</p>
      <small style="color:var(--green);font-size:11px;font-weight:700;display:block;margin-top:4px">
        ${esc(t.time)} · ${t.done ? '✓ concluída' : 'pendente'}
      </small>
    </div>`).join('');

  modal(`Plano de ${stamp(plan.createdAt)}`, imgHtml + tasksHtml);
}
