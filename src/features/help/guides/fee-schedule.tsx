import type { PageGuideContent } from "@/features/help/types";

export const feeScheduleGuide: PageGuideContent = {
  id: "fee-schedule",
  title: "Como usar a composição da mensalidade",
  intro:
    "Aqui fica quanto vale a mensalidade e para onde vai cada parte: caixa do grupo, caixinha do ramo, lanche e clube. Os valores valem por período.",
  steps: [
    {
      id: "periods",
      title: "Períodos de vigência",
      body: (
        <>
          <p>
            Cada período tem um mês de início e, se quiser, um mês de fim. Sem fim, ele vale até existir um período mais
            novo.
          </p>
          <p>
            Para mudar o valor só por um ou dois meses, crie um período com início e fim. Quando ele acabar, o período
            anterior volta a valer sozinho.
          </p>
        </>
      ),
    },
    {
      id: "parts",
      title: "As partes",
      body: (
        <>
          <p>
            <strong>Operacional</strong>, <strong>caixinha do ramo</strong> e <strong>lanche</strong> formam a base.
            Sócio do Lindóia paga só a base.
          </p>
          <p>
            Não sócio paga também a <strong>taxa do clube</strong> (no prazo ou após o vencimento) e a{" "}
            <strong>diluição</strong> de dez/jan/fev, que fica com o grupo. O <strong>acréscimo por atraso</strong> vai
            para o grupo.
          </p>
          <p className="muted">
            Irmãos e filhos de chefe têm valor fixo: não muda com atraso. Período sem valor especial: pagam a tabela do
            ramo.
          </p>
        </>
      ),
    },
    {
      id: "effects",
      title: "O que muda ao salvar",
      body: (
        <>
          <p>Cobranças em aberto dos meses afetados são recalculadas. Mensalidades pagas mantêm o valor pago.</p>
          <p>
            Repasse ao clube, taxa do lanche e a caixinha nos relatórios por ramo seguem a composição de cada mês —
            inclusive de meses já fechados. Por isso, prefira criar um período novo em vez de alterar um antigo.
          </p>
          <p className="muted">
            “Divisão a confirmar” marca perfis em que o total está certo, mas a divisão entre as partes ainda não foi
            confirmada pela tesouraria.
          </p>
        </>
      ),
    },
  ],
};
