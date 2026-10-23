/** Settings view — Gemma toggle, audio toggle, sync auth, queue status */
import { state }        from '../state.js';
import { dbPut }        from '../db.js';
import { rerender, toast } from '../utils.js';
import { waitingCount } from '../sync.js';

export function html() {
  const { gemma, audio, syncAuthorized } = state.settings;
  const pending = waitingCount();

  return `
    <section>
      <span class="eyebrow">Privacidade e IA</span>
      <h1 class="view-title">Ajustes</h1>
      <p class="lead">Noor foi desenhado para funcionar sem depender da internet.</p>

      <!-- Gemma local -->
      <div class="card model-panel">
        <h2>Gemma 3 local</h2>
        <p>Um Gemma 3 4B quantizado pode extrair texto localmente. Toda saída é validada antes de criar tarefas. Requer <strong>llama.cpp</strong> rodando em <code>localhost:8080</code>.</p>
        <div class="model-status">
          Status: <b>${gemma ? 'tentando conectar em localhost:8080' : 'modo seguro local ativo (regex)'}</b>
        </div>
        <button class="btn-secondary" id="gemma-toggle">
          ${gemma ? '⏹ Desativar Gemma local' : '▶ Ativar Gemma local'}
        </button>
      </div>

      <!-- Audio responses -->
      <div class="card setting-item">
        <div>
          <h3>Respostas faladas</h3>
          <p>Noor confirma tarefas concluídas em voz alta.</p>
        </div>
        <button class="toggle-btn${audio ? ' on' : ''}" id="audio-toggle" aria-pressed="${audio}">
          <span class="toggle-knob"></span>
        </button>
      </div>

      <!-- Sync authorization -->
      <div class="card setting-item">
        <div>
          <h3>Autorizar sincronização</h3>
          <p>Envie a fila à clínica somente quando autorizado por você ou pelo agente.</p>
        </div>
        <button class="toggle-btn${syncAuthorized ? ' on' : ''}" id="sync-auth-toggle" aria-pressed="${syncAuthorized}">
          <span class="toggle-knob"></span>
        </button>
      </div>

      <!-- Queue status -->
      <div class="notice">
        ${pending > 0
          ? `↑ <strong>${pending}</strong> registro(s) na fila aguardando sinal de internet.`
          : '✓ Fila vazia — tudo sincronizado.'}
        <br><br>
        🔒 Esta demonstração simula o recebimento pela clínica. Nenhum dado é enviado a servidores externos de verdade.
      </div>
    </section>`;
}

export function bind() {
  document.getElementById('gemma-toggle')?.addEventListener('click', async () => {
    state.settings.gemma = !state.settings.gemma;
    await dbPut('settings', state.settings, 'app');
    rerender();
  });

  document.getElementById('audio-toggle')?.addEventListener('click', async () => {
    state.settings.audio = !state.settings.audio;
    await dbPut('settings', state.settings, 'app');
    rerender();
  });

  document.getElementById('sync-auth-toggle')?.addEventListener('click', async () => {
    state.settings.syncAuthorized = !state.settings.syncAuthorized;
    await dbPut('settings', state.settings, 'app');
    toast(state.settings.syncAuthorized ? 'Sincronização autorizada.' : 'Sincronização bloqueada.');
    rerender();
  });
}
