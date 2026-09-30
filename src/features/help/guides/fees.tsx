import type { PageGuideContent } from "@/features/help/types";

export const feesGuide: PageGuideContent = {
  id: "fees",
  title: "Como usar o cadastro de taxas",
  intro:
    "Tabela oficial da mensalidade (base, extra de não sócio, pontualidade e atraso) e demais taxas do grupo usadas nos cálculos.",
  steps: [
    {
      id: "list",
      title: "Lista de taxas",
      body: (
        <>
          <p>
            Cada taxa tem nome, valores e regras. A mensalidade oficial alimenta a grade e o cartaz; outras taxas
            permanecem neste cadastro para referência e lançamentos.
          </p>
        </>
      ),
    },
    {
      id: "create",
      title: "Nova ou alterar taxa",
      body: (
        <>
          <p>
            Em <strong>Nova taxa</strong> ou ao editar: defina os valores (pontual, atraso, extras) conforme o tipo.
            Mudanças na tabela oficial passam a valer nos novos cálculos de mensalidade.
          </p>
        </>
      ),
    },
    {
      id: "care",
      title: "Cuidado ao alterar",
      body: (
        <>
          <p>
            Alterar a tabela no meio do ano afeta cobranças futuras. Lançamentos já pagos no caixa não são reescritos
            automaticamente — ajuste pontual fica no fluxo ou na célula da mensalidade.
          </p>
        </>
      ),
    },
  ],
};
