import type { PageGuideContent } from "@/features/help/types";

export const dashboardGuide: PageGuideContent = {
  id: "dashboard",
  title: "Como usar o dashboard",
  intro: "Painel do administrador: visão do período, associados, caixa, previsão × realizado e gráficos por ramo.",
  steps: [
    {
      id: "period",
      title: "Escolha o período",
      body: (
        <>
          <p>
            Use o filtro de mês e ano (ou ano todo). Todos os cards e gráficos respondem a esse recorte. O atalho{" "}
            <strong>Abrir previsão</strong> leva ao orçamento anual.
          </p>
        </>
      ),
    },
    {
      id: "kpis",
      title: "Indicadores principais",
      body: (
        <>
          <ul>
            <li>Arrecadação (entradas) do período</li>
            <li>Quantidade de associados e ativos</li>
            <li>Saldo inicial e saldo atual</li>
            <li>Entradas, saídas e resultado</li>
            <li>Filhotes a Grupo (quando aplicável)</li>
          </ul>
        </>
      ),
    },
    {
      id: "budget",
      title: "Previsão × realizado",
      body: (
        <>
          <p>
            Bloco do orçamento do ano: planejado, realizado, saldo da previsão e % usado, com situação (no caminho,
            acima do ritmo ou estourou). Detalhe por ramo e por tipo de movimentação.
          </p>
        </>
      ),
    },
    {
      id: "charts",
      title: "Balanço e arrecadação por ramo",
      body: (
        <>
          <p>
            Gráficos de entradas × saídas e arrecadação por ramo (Filhotes a Grupo). A tabela de totais por ramo aceita
            busca e paginação.
          </p>
        </>
      ),
    },
  ],
};
