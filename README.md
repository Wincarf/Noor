# Noor — Cuidado sem conexão

> Planos de cuidado de saúde offline para agricultoras rurais.  

---

## O Problema

Noor é uma agricultora nas terras altas de Ondera. Ela sai de uma clínica distante com um papel cheio de orientações médicas complexas — mas não tem tempo, memória ou letramento digital para gerenciar isso sozinha, e o sinal de internet é fraco.

## A Solução

Um Progressive Web App (PWA) que:

1. **Ingere** orientações por foto (OCR), voz (SpeechRecognition) ou texto
2. **Organiza** com IA local (Gemma 3 4B) ou extrator de regex offline em um plano de cuidado diário estruturado
3. **Acompanha** tarefas com marcação de conclusão e registro de dificuldades
4. **Sincroniza** com a clínica via *store-and-forward* quando o sinal 3G retorna

---

## Estrutura do Projeto

```
Noor/
├── index.html              # Shell HTML — PWA, manifest, Tesseract.js CDN
├── manifest.webmanifest    # PWA manifest
├── sw.js                   # Service Worker (cache-first + stale-while-revalidate)
├── server.js               # Node.js server (static files + /api/sync)
├── clinic-records.json     # Gerado: fila recebida pela clínica (simulação)
│
├── assets/
│   └── icon.svg
│
├── styles/
│   ├── main.css            # @import entry point
│   ├── base.css            # Design tokens, reset, tipografia
│   ├── layout.css          # App shell, topbar, bottom nav
│   ├── components.css      # Cards, botões, formulários, modal, toast
│   └── animations.css      # Spinners, transições, micro-animações
│
└── src/
    ├── app.js              # 🔑 Router principal — define nav() e init()
    ├── state.js            # Singleton de estado compartilhado
    ├── utils.js            # Helpers: esc, uid, toast, modal, greeting…
    ├── db.js               # IndexedDB wrapper (promise-based)
    ├── ai.js               # Gemma local + extrator regex + OCR (Tesseract)
    ├── audio.js            # MediaRecorder + SpeechSynthesis
    ├── sync.js             # Store-and-forward queue com retry exponencial
    └── views/
        ├── home.js         # Hoje: tarefas, strip de sync, modal de relato
        ├── add.js          # Adicionar: foto/OCR, voz, áudio, demo seed
        ├── review.js       # Revisão: confirmar tarefas antes de salvar
        ├── history.js      # Histórico: planos e relatos com status
        ├── settings.js     # Ajustes: Gemma, áudio, autorização de sync
        └── evidence.js     # Impacto: citações World Bank, WHO, GSMA
```

---

## Como Rodar

```bash
# Sem dependências — apenas Node.js nativo
node server.js

# Abrir no browser
open http://localhost:4173
```

Para demonstração rápida: clique em **Adicionar → Carregar exemplo**, depois em **Organizar plano com segurança**.

---

## IA e Processamento

### Modo Offline (padrão)
Extrator de regex em `src/ai.js` que:
- Detecta medicamentos, retornos, monitoramento por padrões em PT-BR
- Extrai horários e frequências do texto
- Sinaliza itens que precisam confirmação humana (`needsReview`)

### Modo Gemma Local (opcional)
Requer `llama.cpp` com `gemma-3-4b-it-q4` em `localhost:8080`.  
Ative em **Ajustes → Ativar Gemma local**.

O prompt inclui:
- Schema JSON explícito com 6 campos por tarefa
- 2 exemplos few-shot em português
- 6 regras absolutas de segurança

### OCR (Tesseract.js)
Ao fotografar um papel, Tesseract.js roda **no navegador** (sem servidor) e extrai o texto automaticamente.

---

## Segurança e Fail-Safe

- ✅ Nunca diagnostica doenças
- ✅ Nunca sugere doses ou medicamentos não explicitados
- ✅ Tarefas com informação incompleta marcadas com `needsReview` — não podem ser salvas sem confirmação humana
- ✅ Sintomas graves (`falta de ar`, `dor no peito`, etc.) disparam alerta de emergência
- ✅ Toda saída da IA é validada pelo `createTask()` antes de virar tarefa

---

## Tecnologia

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | Zero dependências, funciona em celular básico |
| Storage | IndexedDB (local) | 100% offline, persiste entre sessões |
| Sync | Store-and-forward + retry | Funciona com sinal intermitente |
| IA local | Gemma 3 4B Q4 (llama.cpp) | Roda sem GPU, sem dados para cloud |
| OCR | Tesseract.js (browser) | Offline, sem servidor |
| PWA | Service Worker + manifest | Instalável, funciona sem internet |

---

## Evidências de Apoio

- **World Bank · Service Delivery Indicators** — disponibilidade de profissionais de saúde em regiões remotas
- **WHO · Global Health Observatory** — cobertura de serviços e força de trabalho em saúde
- **GSMA · Mobile Gender Gap Report** — mulheres rurais têm 19% menos acesso à internet móvel
- **WHO · Adherence to Long-term Therapies** — adesão ao tratamento em países em desenvolvimento é de ~50%
