/** Shared utilities */

export const $  = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

/** XSS-safe escaping */
export const esc = v =>
  String(v || '').replace(/[&<>'"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));

export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const tidy = v => String(v || '').trim().replace(/\s+/g, ' ');

/** Red-flag symptom detector */
export const urgent = text =>
  /(falta de ar|dificuldade (para )?respirar|desmaio|convuls|dor no peito|sangramento intenso|fraqueza de um lado|confus[aã]o repentina|l[aá]bios? rox|rea[cç][aã]o al[eé]rgica|inchaço no rosto|perda de consciência)/i
    .test(text || '');

/** Time-aware greeting */
export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** Formatted today string */
export function todayFull() {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
    .format(new Date())
    .replace(/^./, c => c.toUpperCase());
}

/** Short date stamp */
export function stamp(value) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Toast notification */
export function toast(message, duration = 3200) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(node._t);
  node._t = setTimeout(() => node.classList.remove('show'), duration);
}

/** Bottom-sheet modal */
export function modal(title, bodyHtml) {
  document.querySelector('.modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal" id="main-modal" role="dialog" aria-modal="true" aria-labelledby="modal-h">
      <div class="modal-content">
        <button class="modal-close" id="modal-close-btn" aria-label="Fechar">×</button>
        <h2 id="modal-h">${title}</h2>
        ${bodyHtml}
      </div>
    </div>`);

  const close = () => document.querySelector('.modal')?.remove();
  document.getElementById('modal-close-btn').onclick = close;
  // Tap backdrop to close
  document.getElementById('main-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('main-modal')) close();
  });
}

export function closeModal() { document.querySelector('.modal')?.remove(); }

/** Re-render current view */
export function rerender() { window.dispatchEvent(new Event('noor:rerender')); }
