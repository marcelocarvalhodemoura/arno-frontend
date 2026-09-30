import type { PageGuideContent } from "@/features/help/types";

export const snackFundGuide: PageGuideContent = {
  id: "snack-fund",
  title: "Como usar a taxa do lanche",
  intro:
    "Cada mensalidade do cartaz (R$ 75) reserva R$ 24 para lanche. Esta tela mostra o que entrou, o que saiu e o saldo disponível — sem misturar a taxa do clube.",
  steps: [
    {
      id: "period",
      title: "Período",
      body: (
        <>
          <p>
            Escolha mês ou ano todo no filtro. Em “Ano todo” vê o consolidado; num mês específico, a lista de associados
            que contribuíram e as despesas.
          </p>
          <p className="muted">
            O atalho <strong>Abrir caixa</strong> leva ao fluxo para lançar compras no tipo certo.
          </p>
        </>
      ),
    },
    {
      id: "collected",
      title: "O que entra",
      body: (
        <>
          <p>
            Soma <strong>R$ 24</strong> por mensalidade <strong>paga no mês</strong> (data de pagamento), de maio a
            novembro. Pioneiros, março/abril e valores especiais familiares não entram.
          </p>
          <p className="muted">A taxa Lindóia (R$ 10 / R$ 20) e a diluição de R$ 4,50 não fazem parte deste saldo.</p>
        </>
      ),
    },
    {
      id: "spent",
      title: "O que sai",
      body: (
        <>
          <p>
            Contam as saídas do caixa cujo tipo de movimentação tenha <strong>Lanche</strong> ou{" "}
            <strong>Alimentação</strong> no nome, no mesmo período.
          </p>
          <p className="muted">Lance compras de mercado/padaria nesse tipo para o gasto aparecer aqui.</p>
        </>
      ),
    },
    {
      id: "available",
      title: "Disponível",
      body: (
        <>
          <p>
            <strong>Disponível = arrecadado − gasto</strong>. Use o saldo para saber quanto ainda pode gastar com lanche
            sem misturar com a taxa do clube.
          </p>
        </>
      ),
    },
  ],
};
