/** Add view — photo, OCR, voice dictation, audio recording, demo seed, AI processing */
import { state }          from '../state.js';
import { esc, toast }     from '../utils.js';
import { process, runOCR } from '../ai.js';
import { startRecording, stopRecording, isRecording } from '../audio.js';

const DEMO_TEXT = `Tomar amoxicilina 500mg 3 vezes ao dia às 8h, 14h e 20h por 7 dias.
Tomar paracetamol 750mg a cada 6 horas se febre acima de 38 graus.
Verificar pressão arterial diariamente pela manhã antes de tomar os medicamentos.
Retornar à clínica em 14 dias para reavaliação com os exames.
Manter repouso relativo nos próximos 3 dias, evitar esforço físico.`;

export function html() {
  return `
    <section>
      <span class="eyebrow">Nova orientação</span>
      <h1 class="view-title">Organizar plano de cuidado.</h1>
      <p class="lead">Tudo fica neste aparelho. Revise o plano antes de salvar.</p>

      <div class="demo-strip">
        <span>🧪 Modo demonstração</span>
        <button id="demo-seed-btn">Carregar exemplo</button>
      </div>

      <div class="action-grid">
        <label class="action-btn" id="photo-label" for="photo-input">
          <span class="action-icon">📷</span>
          <strong>Fotografar o papel</strong>
          <small>A foto fica salva no plano e pode ser lida por OCR.</small>
          <input id="photo-input" type="file" accept="image/*" capture="environment" />
        </label>
        <button class="action-btn" id="voice-btn">
          <span class="action-icon">🎤</span>
          <strong>Ditar orientação</strong>
          <small>Reconhecimento de voz em português.</small>
        </button>
      </div>

      <img id="img-preview" class="image-preview" hidden alt="Pré-visualização da foto" />

      <div id="ocr-status" class="ocr-status" hidden>
        <span class="spinner-sm"></span>
        <span id="ocr-msg">Lendo texto da imagem…</span>
      </div>

      <div class="audio-row">
        <button class="btn-secondary" id="record-btn">🎙 Gravar áudio</button>
        <span id="audio-state" class="audio-state">${state.audioBlob ? '✓ Áudio anexado' : 'Opcional: relato para o agente'}</span>
      </div>

      <label class="input-label" for="orientation">Transcrição ou texto do papel</label>
      <textarea id="orientation" class="text-input"
                placeholder="Ex.: Tomar o remédio conforme receita. Retornar à clínica se sentir falta de ar."></textarea>

      <div class="notice">
        🔒 Sem Gemma local, Noor usa extração local segura e nunca inventa informações ausentes.
      </div>

      <button class="btn-primary" id="process-btn">Organizar plano com segurança</button>
    </section>`;
}

export function bind() {
  // Demo seed
  document.getElementById('demo-seed-btn').addEventListener('click', () => {
    document.getElementById('orientation').value = DEMO_TEXT;
    toast('Exemplo carregado. Toque em "Organizar plano" para continuar.');
  });

  // Photo input
  document.getElementById('photo-input').addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.imageData = reader.result;
      const img = document.getElementById('img-preview');
      img.src = reader.result;
      img.hidden = false;
      toast('Foto carregada. Tente "Organizar" — OCR lerá o texto automaticamente.');
      attemptOCR(reader.result);
    };
    reader.readAsDataURL(file);
  });

  // Voice dictation
  document.getElementById('voice-btn').addEventListener('click', () => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Rec) return toast('Ditado não disponível. Grave áudio ou escreva a orientação.');
    const recognition = new Rec();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = e => {
      const t = e.results[0][0].transcript;
      document.getElementById('orientation').value = t;
      toast('Orientação transcrita. Revise antes de organizar.');
    };
    recognition.onerror = () => toast('Não foi possível capturar o áudio.');
    recognition.start();
    toast('Ouvindo… fale a orientação agora.');
  });

  // Audio recording
  document.getElementById('record-btn').addEventListener('click', () => {
    const btn = document.getElementById('record-btn');
    const lbl = document.getElementById('audio-state');
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
      toast('Toque novamente para parar a gravação.');
    }
  });

  // Process button
  document.getElementById('process-btn').addEventListener('click', handleProcess);
}

async function attemptOCR(imageDataUrl) {
  const statusEl = document.getElementById('ocr-status');
  const msgEl    = document.getElementById('ocr-msg');
  statusEl.hidden = false;
  try {
    const text = await runOCR(imageDataUrl, pct => {
      msgEl.textContent = `Lendo texto da imagem… ${pct}%`;
    });
    const cleaned = text.trim();
    if (cleaned) {
      document.getElementById('orientation').value = cleaned;
      msgEl.textContent = '✓ Texto extraído da imagem';
      toast('OCR concluído! Revise o texto extraído abaixo.');
    } else {
      msgEl.textContent = 'OCR não encontrou texto. Transcreva manualmente.';
    }
  } catch {
    msgEl.textContent = 'OCR indisponível. Transcreva o papel manualmente.';
  }
}

async function handleProcess() {
  const text = document.getElementById('orientation').value.trim();
  if (!text && !state.imageData) return toast('Escreva, dite ou escolha uma foto.');
  if (state.imageData && !state.settings.gemma && !text) {
    return toast('Transcreva a foto no campo de texto ou ative o Gemma local.');
  }

  const btn = document.getElementById('process-btn');
  btn.disabled    = true;
  btn.textContent = 'Organizando…';

  // Show inline spinner
  const spinnerHtml = `
    <div class="processing-card" id="proc-card">
      <div class="spinner"></div>
      <p>Analisando a orientação de forma segura.<br>Nunca é adicionado o que não está no papel.</p>
    </div>`;
  btn.insertAdjacentHTML('afterend', spinnerHtml);

  try {
    const result = await process(text, state.imageData, state.settings.gemma);
    state.draft = {
      ...result,
      source: text || 'Orientação em foto — transcrição pendente',
      image:  state.imageData || null,
    };
    location.hash = 'review';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Organizar plano com segurança';
    document.getElementById('proc-card')?.remove();
  }
}
