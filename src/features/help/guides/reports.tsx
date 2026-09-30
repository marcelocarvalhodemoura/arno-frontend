import type { PageGuideContent } from "@/features/help/types";

export const reportsGuide: PageGuideContent = {
  id: "reports",
  title: "Como usar os relatórios",
  intro:
    "Modelos para comissão fiscal e sínteses gerenciais: por ramo, por tipo de movimentação ou por titular da conta.",
  steps: [
    {
      id: "models",
      title: "Escolha o tipo",
      body: (
        <>
          <ul>
            <li>
              <strong>Comissão fiscal</strong> — livro-caixa numerado, saldo acumulado e espaços de assinatura
            </li>
            <li>
              <strong>Por ramo</strong> — síntese por seção (na mensalidade entra a caixinha do ramo)
            </li>
            <li>
              <strong>Por tipo</strong> — entradas e saídas por rubrica
            </li>
            <li>
              <strong>Por conta</strong> — agrupado pelo titular vinculado ao lançamento
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "filters",
      title: "Período e filtros",
      body: (
        <>
          <p>
            Defina de/até, agrupamento da síntese, ramo, tipo, natureza e demais filtros disponíveis. Depois clique em{" "}
            <strong>Gerar relatório</strong>.
          </p>
        </>
      ),
    },
    {
      id: "export",
      title: "Imprimir e CSV",
      body: (
        <>
          <p>
            Com o resultado na tela: <strong>Imprimir</strong> abre a versão para papel (útil na comissão fiscal) e o
            CSV baixa a planilha para conferência externa.
          </p>
        </>
      ),
    },
    {
      id: "totals",
      title: "Totais",
      body: (
        <>
          <p>
            Os cards de saldo inicial, entradas, saídas e saldo final resumem o intervalo gerado. Confira o ledger linha
            a linha antes de apresentar à comissão.
          </p>
        </>
      ),
    },
  ],
};
