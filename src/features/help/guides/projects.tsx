import type { PageGuideContent } from "@/features/help/types";

export const projectsGuide: PageGuideContent = {
  id: "projects",
  title: "Como usar a previsão de gastos",
  intro:
    "Orçamento anual por ramo: planeje itens, acompanhe o realizado pelos lançamentos do caixa vinculados à previsão.",
  steps: [
    {
      id: "tabs",
      title: "Escolha o ramo",
      body: (
        <>
          <p>
            As abas no topo selecionam o ramo (ou o grupo). Cada um tem a própria previsão do ano selecionado no período
            do sistema.
          </p>
        </>
      ),
    },
    {
      id: "create",
      title: "Criar previsão ou incluir item",
      body: (
        <>
          <p>
            Se não houver previsão no ramo/ano, use <strong>Nova previsão</strong>. Com previsão existente,{" "}
            <strong>Incluir item</strong> adiciona linhas (descrição, valor planejado, tipo de movimentação quando
            couber).
          </p>
        </>
      ),
    },
    {
      id: "track",
      title: "Planejado × realizado",
      body: (
        <>
          <p>
            O realizado vem dos lançamentos do caixa ligados a esta previsão. Compare item a item e o total do ramo para
            ver se o ano está no caminho, acima do ritmo ou estourou.
          </p>
        </>
      ),
    },
    {
      id: "edit",
      title: "Editar e remover",
      body: (
        <>
          <p>
            Edite a previsão ou cada item. Remova itens que não valem mais. Alterações de valor planejado não apagam o
            histórico já realizado no caixa.
          </p>
        </>
      ),
    },
  ],
};
