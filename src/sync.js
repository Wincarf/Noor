/** Store-and-forward queue: save locally, sync to clinic when online */
import { state }            from './state.js';
import { dbPut }            from './db.js';
import { uid, toast, rerender } from './utils.js';

/** Number of items waiting to be synced */
export const waitingCount = () => state.queue.filter(q => q.status === 'queued').length;

/** Add an item to the sync queue */
export async function enqueue(type, entityId, summary) {
  const entry = { id: uid(), type, entityId, summary, status: 'queued', createdAt: Date.now() };
  state.queue.unshift(entry);
  await dbPut('queue', entry);
}

/** Persist a plan and enqueue it for sync */
export async function savePlan(plan, type) {
  await dbPut('plans', plan);
  const i = state.plans.findIndex(p => p.id === plan.id);
  i < 0 ? state.plans.unshift(plan) : (state.plans[i] = plan);
  await enqueue(type || 'plan', plan.id, type === 'completion' ? 'Tarefa concluída' : 'Plano atualizado');
}

/** Attempt sync with exponential-ish retry */
export async function syncNow() {
  if (!state.settings.syncAuthorized) {
    return toast('Autorize a sincronização em Ajustes primeiro.');
  }
  if (!navigator.onLine) {
    return toast('Sem sinal. A fila continua guardada neste aparelho.');
  }
  const items = state.queue.filter(q => q.status === 'queued');
  if (!items.length) return toast('Não há registros aguardando envio.');

  const attempt = async (retries = 2, delay = 1500) => {
    try {
      const res = await fetch('/api/sync', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          sentAt:  new Date().toISOString(),
          queue:   items,
          plans:   state.plans,
          reports: state.reports,
        }),
      });
      if (!res.ok) throw new Error('clinic_error');
      return true;
    } catch {
      if (retries > 0) {
        await new Promise(r => setTimeout(r, delay));
        return attempt(retries - 1, delay * 2);
      }
      return false;
    }
  };

  toast('Sincronizando…');
  const ok = await attempt();
  if (!ok) { toast('Clínica indisponível. A fila continua salva neste aparelho.'); return; }

  for (const item of items) {
    item.status   = 'synced';
    item.syncedAt = Date.now();
    await dbPut('queue', item);
    if (item.type === 'report') {
      const r = state.reports.find(r => r.id === item.entityId);
      if (r) { r.status = 'synced'; await dbPut('reports', r); }
    }
  }
  toast(`✓ ${items.length} registro(s) recebidos pela clínica.`);
  rerender();
}
