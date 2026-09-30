import type { PageGuideContent } from "@/features/help/types";

export const arrearsGuide: PageGuideContent = {
  id: "arrears",
  title: "Como usar as dívidas",
  intro: "Acordos de atrasados em parcelas: embutidos na mensalidade ou como lançamento à parte no fluxo de caixa.",
  steps: [
    {
      id: "list",
      title: "Lista e filtros",
      body: (
        <>
          <p>
            Busque por associado ou nota. Filtre por status: ativos, quitados, cancelados ou todos. A tabela mostra
            valor, parcelas, modo de cobrança e progresso.
          </p>
        </>
      ),
    },
    {
      id: "create",
      title: "Novo acordo",
      body: (
        <>
          <p>
            Em <strong>Novo acordo</strong> escolha o associado, valor total, número de parcelas, mês de início e o
            modo:
          </p>
          <ul>
            <li>
              <strong>Embutido na mensalidade</strong> — a parcela entra junto com a mensalidade do mês
            </li>
            <li>
              <strong>Lançamento à parte</strong> — gera cobrança separada no fluxo
            </li>
          </ul>
          <p className="muted">Use a nota para registrar o contexto do acordo.</p>
        </>
      ),
    },
    {
      id: "detail",
      title: "Controle e pagamentos",
      body: (
        <>
          <p>
            Abra o detalhe para ver progresso (pago, saldo, %), histórico de baixas e registrar pagamento avulso
            (parcela ou quitação). Indique método (Pix, dinheiro, transferência, cartão) e data.
          </p>
        </>
      ),
    },
    {
      id: "cancel",
      title: "Cancelar acordo",
      body: (
        <>
          <p>
            Acordos ativos podem ser cancelados quando não forem mais cobrados. Quitados permanecem no histórico para
            conferência.
          </p>
        </>
      ),
    },
  ],
};
