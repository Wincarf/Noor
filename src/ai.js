/**
 * AI module — local regex extractor + Gemma local integration + Tesseract OCR
 * Safety rule: NEVER alter prescriptions, doses or diagnose.
 */
import { tidy, uid, todayKey, urgent, toast } from './utils.js';

// ── Gemma system prompt: explicit JSON schema + two few-shot examples ──
const GEMMA_SYSTEM = `Você é um assistente de organização de orientações médicas para pacientes rurais.
Seu ÚNICO papel é extrair e estruturar informações JÁ EXPLÍCITAS no documento. Não invente, complete ou corrija nada.

REGRAS ABSOLUTAS — violação invalida todo o output:
1. NUNCA diagnostique doenças
2. NUNCA sugira medicamentos, doses ou horários não explicitados
3. NUNCA complete informações ausentes ou ambíguas
4. NUNCA altere prescrições existentes
5. Instrução ambígua → "uncertainties"
6. Emergência ou sintoma grave → "safety_flags"
7. Responda SOMENTE JSON válido, sem texto fora do JSON

SCHEMA (siga exatamente este formato):
{
  "tasks": [
    {
      "title": "string curta ≤ 40 chars",
      "verbatim": "frase exata copiada do documento",
      "time": "horário ou frequência exatos como escritos, ou null",
      "frequency": "frequência textual como escrita, ou null",
      "category": "medication | followup | monitoring | care",
      "needs_review": true ou false
    }
  ],
  "uncertainties": ["frases ilegíveis, incompletas ou ambíguas"],
  "safety_flags": ["frases de emergência ou sintoma grave"]
}

EXEMPLO 1:
Documento: "Tomar amoxicilina 500mg 3x ao dia por 7 dias. Retornar em 2 semanas se febre persistir."
Resposta: {"tasks":[{"title":"Amoxicilina 500mg","verbatim":"Tomar amoxicilina 500mg 3x ao dia por 7 dias","time":"3x ao dia","frequency":"3x ao dia","category":"medication","needs_review":false},{"title":"Retorno à clínica","verbatim":"Retornar em 2 semanas se febre persistir","time":"em 2 semanas","frequency":null,"category":"followup","needs_review":false}],"uncertainties":[],"safety_flags":[]}

EXEMPLO 2:
Documento: "Usar o remédio conforme indicado. Verificar pressão diariamente. Se sentir falta de ar, ir ao pronto-socorro imediatamente."
Resposta: {"tasks":[{"title":"Medicamento — confirmar dose","verbatim":"Usar o remédio conforme indicado","time":null,"frequency":null,"category":"medication","needs_review":true},{"title":"Medir pressão arterial","verbatim":"Verificar pressão diariamente","time":"diariamente","frequency":"diariamente","category":"monitoring","needs_review":false}],"uncertainties":["Usar o remédio conforme indicado — nome e dose não especificados"],"safety_flags":["Se sentir falta de ar, ir ao pronto-socorro imediatamente"]}`;

// ── Regex patterns ─────────────────────────────────────────────────────
const MED_RE  = /(tomar|usar|aplicar|ingerir|medicamento|comprimido|cápsula|xarope|pomada|colírio|injeção|bid|tid|prn)/i;
const FOLL_RE = /(retorn|voltar|consulta|clínica|hospital|pronto.socorro)/i;
const MON_RE  = /(medir|verificar|monitorar|pressão|temperatura|glicemia|peso|pulso|saturação)/i;

/** Extract time from text */
function getTime(text) {
  return (
    text.match(/\b(?:[01]?\d|2[0-3])(?:[:h][0-5]\d)?\b/)?.[0] ||
    text.match(/pela manhã|à noite|antes de dormir|ao acordar|após (?:o )?almoço|ao deitar/i)?.[0] ||
    ''
  );
}

/** Extract frequency from text */
function getFrequency(text) {
  return (
    text.match(/a cada\s+\d+\s*(?:horas?|h)|\d+\s*(?:x|vez(?:es)?)\s*(?:ao )?dia|diariamente|duas vezes|uma vez|semanalmente/i)?.[0] ||
    ''
  );
}

/** Build a task object from a sentence, optionally merging Gemma overrides */
export function createTask(sentence, overrides = {}) {
  const time      = overrides.time      ?? getTime(sentence);
  const frequency = overrides.frequency ?? getFrequency(sentence);
  const isMed     = MED_RE.test(sentence);
  const isFollow  = FOLL_RE.test(sentence);
  const isMon     = MON_RE.test(sentence);
  const category  = overrides.category ?? (isMed ? 'medication' : isFollow ? 'followup' : isMon ? 'monitoring' : 'care');

  const needsReview =
    overrides.needs_review !== undefined
      ? overrides.needs_review
      : isMed && (!time || !/\d+(?:[.,]\d+)?\s*(?:mg|ml|comprimid|cápsul|gota|unidade)/i.test(sentence));

  return {
    id:          uid(),
    title:       overrides.title ?? (isMed ? 'Cuidado com medicamento' : isFollow ? 'Retorno à clínica' : isMon ? 'Verificação de saúde' : 'Orientação de cuidado'),
    details:     sentence,
    verbatim:    sentence,
    time:        time || frequency || 'Conforme orientação',
    frequency,
    category,
    date:        todayKey(),
    done:        false,
    confirmed:   false,
    needsReview,
    createdAt:   Date.now(),
  };
}

/** Local regex-based extractor (offline fallback) */
export function extractLocal(text) {
  const tasks = [], uncertainties = [], safety = [];
  const source = tidy(text);
  if (!source) {
    return { tasks, uncertainties: ['Não foi possível ler a orientação. Peça ajuda para transcrever o papel.'], safety };
  }
  source
    .split(/(?<=[.!;])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 5)
    .forEach(line => {
      if (urgent(line))               { safety.push(line);       return; }
      if (/ilegível|\?\?\?/i.test(line)) { uncertainties.push(line); return; }
      if (MED_RE.test(line) || FOLL_RE.test(line) || MON_RE.test(line)) {
        tasks.push(createTask(line));
      }
    });
  if (!tasks.length && !uncertainties.length) {
    uncertainties.push('Nenhuma tarefa clara encontrada. Revise com o agente de saúde ou adicione mais detalhes.');
  }
  return { tasks, uncertainties, safety };
}

/** Call Gemma local server (llama.cpp /v1/chat/completions) */
export async function processWithGemma(text, image) {
  const content = image
    ? [
        { type: 'text', text: 'DOCUMENTO MÉDICO:\n' + (text || '[imagem anexada]') },
        { type: 'image_url', image_url: { url: image } },
      ]
    : 'DOCUMENTO MÉDICO:\n' + text;

  const res = await fetch('http://127.0.0.1:8080/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:           'gemma-3-4b-it-q4',
      temperature:     0,
      max_tokens:      1500,
      messages:        [{ role: 'system', content: GEMMA_SYSTEM }, { role: 'user', content }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error('gemma_offline');
  const data = JSON.parse((await res.json()).choices[0].message.content);
  return {
    tasks: (data.tasks || [])
      .filter(t => t && t.verbatim)
      .map(t => createTask(t.verbatim, {
        title: t.title, time: t.time, frequency: t.frequency,
        category: t.category, needs_review: t.needs_review,
      })),
    uncertainties: Array.isArray(data.uncertainties) ? data.uncertainties : [],
    safety:        Array.isArray(data.safety_flags)   ? data.safety_flags  : [],
  };
}

/** Main process function: tries Gemma, falls back to local extractor */
export async function process(text, image, useGemma) {
  if (!useGemma) return extractLocal(text);
  try {
    return await processWithGemma(text, image);
  } catch {
    toast('Gemma local não respondeu. Usando modo seguro offline.');
    return extractLocal(text);
  }
}

/** OCR via Tesseract.js (loaded from CDN in index.html) */
export async function runOCR(imageDataUrl, onProgress) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js not available');
  const worker = await Tesseract.createWorker('por', 1, {
    logger: m => {
      if (m.status === 'recognizing text') onProgress?.(Math.round(m.progress * 100));
    },
  });
  const { data: { text } } = await worker.recognize(imageDataUrl);
  await worker.terminate();
  return text;
}
