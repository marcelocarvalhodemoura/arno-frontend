import type { PageGuideContent } from "@/features/help/types";

export const clubRemittanceGuide: PageGuideContent = {
  id: "club-remittance",
  title: "Como usar o repasse ao clube",
  intro:
    "Todo mês o grupo repassa ao Lindóia Tênis Clube a taxa embutida nas mensalidades. Esta tela soma o que foi pago no mês e registra a saída no caixa.",
  steps: [
    {
      id: "period",
      title: "Mês ou ano todo",
      body: (
        <>
          <p>
            Em “Ano todo” você vê o resumo (a repassar, já repassado, pontual × atraso). Abra um mês no período para
            detalhar e lançar.
          </p>
        </>
      ),
    },
    {
      id: "paid-month",
      title: "Base: pago no mês",
      body: (
        <>
          <p>
            O cálculo usa a <strong>data de pagamento</strong> da mensalidade, não o mês de vencimento. Quem pagou em
            setembro a mensalidade de maio entra no repasse de setembro.
          </p>
          <p className="muted">Só entram lançamentos pagos com a taxa do clube incluída naquele mês.</p>
        </>
      ),
    },
    {
      id: "amounts",
      title: "Quanto repassar",
      body: (
        <>
          <p>
            Taxa Lindóia: <strong>R$ 10</strong> se o pagamento foi até o vencimento, <strong>R$ 20</strong> se foi
            depois. A diluição de R$ 4,50 fica com o grupo e não entra no repasse.
          </p>
          <p className="muted">Valor especial familiar e meses de março/abril não têm parcela destacável do clube.</p>
        </>
      ),
    },
    {
      id: "register",
      title: "Registrar no caixa",
      body: (
        <>
          <p>
            Confira a lista do mês e clique em <strong>Registrar repasse</strong>. O sistema cria uma saída do tipo
            “Repasse Lindóia Tênis Clube”. Cada mês só pode ser registrado uma vez.
          </p>
        </>
      ),
    },
  ],
};
