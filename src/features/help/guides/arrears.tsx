import type { PageGuideContent } from "@/features/help/types";

export const arrearsGuide: PageGuideContent = {
  id: "arrears",
  title: "Como usar as dívidas",
  intro:
    "Acordos de atrasados em parcelas: embutidos na mensalidade ou como lançamento à parte no fluxo de caixa — e como isso se junta a adiantamento e ao extrato bancário.",
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
            Em <strong>Novo acordo</strong> escolha o associado, valor total da dívida, número de parcelas (2–12),
            primeira competência e o modo:
          </p>
          <ul>
            <li>
              <strong>Embutido na mensalidade</strong> — a parcela entra no valor da mensalidade (mar–nov). Na grade, a
              célula já mostra mensalidade + parcela. Ao baixar a mensalidade, a parcela do acordo também é paga.
            </li>
            <li>
              <strong>Lançamento à parte</strong> — gera cobrança separada no fluxo (tipo Acordo / dívida). Mensalidade
              e dívida são linhas distintas.
            </li>
          </ul>
          <p className="muted">Use a nota para registrar o contexto (ex.: atraso 2024 diluído em 2026).</p>
        </>
      ),
    },
    {
      id: "with-mensalidade",
      title: "Dívida + mensalidade no dia a dia",
      body: (
        <>
          <ul>
            <li>
              <strong>Só a parcela do mês (embutido)</strong> — baixe a mensalidade normalmente; o valor já inclui a
              dívida da competência.
            </li>
            <li>
              <strong>Adiantamento de mensalidades com acordo embutido</strong> — na tela Mensalidades (ou Marcar como
              pago no caixa), marque os outros meses; cada um leva sua parcela de dívida se o acordo cobrir essas
              competências.
            </li>
            <li>
              <strong>Dívida à parte + mensalidade no mesmo PIX</strong> — no Fluxo, rateie o crédito: uma parte
              Mensalidade e outra Acordo/dívida (ou baixe cada linha pendente).
            </li>
            <li>
              <strong>Quitação avulsa / antecipar parcelas</strong> — no detalhe do acordo, registre pagamento (parcela
              ou valor maior) com método e data, sem passar pela mensalidade.
            </li>
            <li>
              <strong>Extrato já pago</strong> — classifique ou rateie no caixa (Mensalidade e/ou Acordo). Não use só
              “Marcar como pago” no crédito do banco. Ver guia do Fluxo de caixa.
            </li>
          </ul>
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
            (parcela ou quitação). Indique método (Pix, dinheiro, transferência, cartão) e data. Em modo à parte, use{" "}
            <strong>Gerar parcelas vencidas</strong> para o retroativo no caixa.
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
