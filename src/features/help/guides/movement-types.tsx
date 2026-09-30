import type { PageGuideContent } from "@/features/help/types";

export const movementTypesGuide: PageGuideContent = {
  id: "movement-types",
  title: "Como usar os tipos de movimentação",
  intro:
    "Rubricas do caixa: mensalidade, sede, doação, lanche, taxa do clube e demais. O ramo diz se o tipo é do grupo ou de uma seção.",
  steps: [
    {
      id: "list",
      title: "Lista e busca",
      body: (
        <>
          <p>
            Filtre e busque tipos já cadastrados. Cada um tem nome, natureza (fixa/variável), se é entrada ou saída, e o
            ramo (ou grupo inteiro).
          </p>
        </>
      ),
    },
    {
      id: "create",
      title: "Novo tipo",
      body: (
        <>
          <p>
            Em <strong>Novo tipo de movimentação</strong> defina nome, direção (entrada/saída), natureza e ramo. O nome
            aparece nos lançamentos, filtros, previsão e na taxa do lanche (tipos com “Lanche” ou “Alimentação”).
          </p>
        </>
      ),
    },
    {
      id: "edit",
      title: "Alterar e excluir",
      body: (
        <>
          <p>
            Edite quando a rubrica mudar de nome ou ramo. Evite excluir tipos já usados em lançamentos históricos —
            prefira deixar de usar em novos movimentos.
          </p>
        </>
      ),
    },
  ],
};
