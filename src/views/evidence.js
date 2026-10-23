/** Evidence view — World Bank, WHO, GSMA citations supporting Noor's design decisions */

export function html() {
  return `
    <section>
      <span class="eyebrow">Impacto e evidências</span>
      <h1 class="view-title">Por que Noor existe.</h1>
      <p class="lead">Continuidade do cuidado quando distância, conectividade e tempo dificultam o retorno à clínica.</p>

      <div class="card evidence-card">
        <h3>📊 Entrega de serviços de saúde</h3>
        <p>Os <em>Service Delivery Indicators</em> do World Bank medem disponibilidade de profissionais, insumos e qualidade do atendimento em países de baixa renda — dimensões diretamente relevantes para o acompanhamento fora da clínica que Noor apoia.</p>
        <a href="https://www.worldbank.org/en/programs/service-delivery-indicators" target="_blank" rel="noreferrer noopener">
          → Fonte: World Bank · Service Delivery Indicators ↗
        </a>
      </div>

      <div class="card evidence-card">
        <h3>🌍 Força de trabalho e cobertura em saúde</h3>
        <p>O <em>Global Health Observatory</em> da OMS reúne indicadores de cobertura de serviços e densidade de trabalhadores de saúde. Em regiões de altas terras rurais, a razão médico/paciente pode ser 10–50× inferior à média urbana.</p>
        <a href="https://www.who.int/data/gho" target="_blank" rel="noreferrer noopener">
          → Fonte: WHO · Global Health Observatory ↗
        </a>
      </div>

      <div class="card evidence-card">
        <h3>📱 Acesso móvel e gênero</h3>
        <p>O <em>Mobile Gender Gap Report</em> da GSMA mostra que mulheres em países de baixa e média renda têm 19% menos probabilidade de usar internet móvel. Noor prioriza telas simples, offline-first e entrada por voz exatamente por isso.</p>
        <a href="https://www.gsma.com/gender-gap/" target="_blank" rel="noreferrer noopener">
          → Fonte: GSMA · Mobile Gender Gap Report ↗
        </a>
      </div>

      <div class="card evidence-card">
        <h3>💊 Adesão ao tratamento</h3>
        <p>Segundo a OMS, a adesão a tratamentos de longo prazo em países em desenvolvimento é de apenas 50%. Lembretes estruturados e acompanhamento por agentes comunitários podem elevar significativamente esse índice.</p>
        <a href="https://www.who.int/chp/knowledge/publications/adherence_report/en/" target="_blank" rel="noreferrer noopener">
          → Fonte: WHO · Adherence to Long-term Therapies ↗
        </a>
      </div>

      <div class="notice">
        🛡 <strong>Guarda-chuva de segurança:</strong> Noor organiza instruções existentes. Nunca diagnostica, nunca altera medicamentos e encaminha qualquer sinal de alerta ao agente comunitário ou à clínica.
      </div>
    </section>`;
}

export function bind() {
  // No interactive elements — pure content
}
