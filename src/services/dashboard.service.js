const { withTenant } = require('../config/db');

// "intervalo" vira um literal de INTERVAL do Postgres via cast ($n::interval).
// "agrupar" é a unidade passada pro date_trunc() do gráfico.
const INTERVALOS = {
  hoje: { intervalo: '1 day', agrupar: 'hour' },
  '7dias': { intervalo: '7 days', agrupar: 'day' },
  '30dias': { intervalo: '30 days', agrupar: 'week' },
};

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function formatarRotulo(data, agrupar) {
  if (agrupar === 'hour') {
    return `${String(data.getHours()).padStart(2, '0')}h`;
  }
  if (agrupar === 'day') {
    return DIAS_SEMANA[data.getDay()];
  }
  return `Sem. ${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
}

async function obterDashboard(empresaId, rangeSolicitado) {
  const range = INTERVALOS[rangeSolicitado] ? rangeSolicitado : 'hoje';
  const config = INTERVALOS[range];

  return withTenant(empresaId, async (client) => {
    // Nota: as métricas de IA/Humano/Pendente refletem o status ATUAL das
    // conversas criadas no período — simplificação adequada pro MVP.
    // Pra métricas que considerem mudança de status ao longo do tempo,
    // um histórico de eventos (fora do escopo do Sprint 1) seria necessário.
    const totaisResult = await client.query(
      `SELECT
         count(*) FILTER (WHERE criado_em >= now() - $2::interval) AS recebidas,
         count(*) FILTER (WHERE status = 'ia' AND criado_em >= now() - $2::interval) AS ia,
         count(*) FILTER (WHERE status = 'humano' AND criado_em >= now() - $2::interval) AS humano,
         count(*) FILTER (WHERE status = 'pendente' AND criado_em >= now() - $2::interval) AS pendente
       FROM conversas
       WHERE empresa_id = $1`,
      [empresaId, config.intervalo]
    );

    const leadsResult = await client.query(
      `SELECT
         count(*) AS total,
         count(*) FILTER (WHERE etapa = 'fechado') AS fechados
       FROM leads
       WHERE empresa_id = $1 AND criado_em >= now() - $2::interval`,
      [empresaId, config.intervalo]
    );

    const chamadosResult = await client.query(
      `SELECT count(*) AS abertos
       FROM tickets
       WHERE empresa_id = $1 AND status IN ('aberto', 'em_analise')`,
      [empresaId]
    );

    const graficoResult = await client.query(
      `SELECT
         date_trunc($3, criado_em) AS periodo,
         count(*) FILTER (WHERE status = 'ia')     AS ia,
         count(*) FILTER (WHERE status = 'humano') AS humano
       FROM conversas
       WHERE empresa_id = $1 AND criado_em >= now() - $2::interval
       GROUP BY periodo
       ORDER BY periodo`,
      [empresaId, config.intervalo, config.agrupar]
    );

    const totais = totaisResult.rows[0];
    const recebidas = Number(totais.recebidas);
    const ia = Number(totais.ia);
    const humano = Number(totais.humano);
    const pendente = Number(totais.pendente);

    const leadsTotal = Number(leadsResult.rows[0].total);
    const leadsFechados = Number(leadsResult.rows[0].fechados);

    const pct = (valor) => (recebidas > 0 ? Math.round((valor / recebidas) * 100) : 0);

    return {
      range,
      recebidas,
      ia,
      iaPct: pct(ia),
      humano,
      humanoPct: pct(humano),
      pendente,
      pendentePct: pct(pendente),
      leads: leadsTotal,
      conversaoCount: leadsFechados,
      conversaoTotal: leadsTotal,
      conversaoPct: leadsTotal > 0 ? Math.round((leadsFechados / leadsTotal) * 100) : 0,
      chamadosAbertos: Number(chamadosResult.rows[0].abertos),
      chart: graficoResult.rows.map((linha) => ({
        label: formatarRotulo(new Date(linha.periodo), config.agrupar),
        ia: Number(linha.ia),
        humano: Number(linha.humano),
      })),
    };
  });
}

module.exports = { obterDashboard };
