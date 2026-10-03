import type { PageGuideContent } from "@/features/help/types";

export const reportsGuide: PageGuideContent = {
  id: "reports",
  title: "Como usar os relatórios",
  intro:
    "Central de relatórios: escolha o relatório, o período e, se quiser, os filtros. Todos saem no mesmo papel timbrado na impressão.",
  steps: [
    {
      id: "catalog",
      title: "Escolha o relatório",
      body: (
        <>
          <p>À esquerda ficam os relatórios, em três grupos. Clicar já gera o relatório com o período escolhido.</p>
          <ul>
            <li>
              <strong>Prestação de contas</strong> — Livro-caixa da comissão fiscal (com assinaturas) e Prestação de
              contas para a assembleia.
            </li>
            <li>
              <strong>Movimentação</strong> — Entradas, Saídas, Por tipo de conta, Evolução mensal, Fixas × variáveis e
              Por meio de pagamento.
            </li>
            <li>
              <strong>Pessoas e ramos</strong> — Por ramo, Por associado, Por conta (titular) e Inadimplência.
            </li>
          </ul>
        </>
      ),
      media: {
        src: "/help/relatorios-saidas.png",
        alt: "Central de relatórios com o catálogo à esquerda e o relatório de saídas à direita",
        caption: "Catálogo, período e resultado lado a lado.",
      },
    },
    {
      id: "period",
      title: "Período, agrupamento e filtros",
      body: (
        <>
          <p>
            Use os atalhos (<em>Este mês</em>, <em>Mês anterior</em>, <em>Ano até hoje</em>, semestres, ano anterior) ou
            digite as datas. <strong>Agrupar por</strong> muda a síntese: tipo de conta, mês, ramo, associado, meio de
            pagamento, natureza ou titular.
          </p>
          <p>
            Em <strong>Filtros</strong> você restringe ramos, direção, natureza e tipos de conta; o resumo ao lado do
            título mostra o que está valendo. Depois de mudar filtros, clique em <strong>Gerar relatório</strong>.
          </p>
          <p className="muted">
            Marque <em>Incluir o livro-caixa detalhado</em> para ver e imprimir lançamento a lançamento, com saldo
            acumulado. Agrupado por ramo, a mensalidade entra só com a caixinha (R$ 8).
          </p>
        </>
      ),
    },
    {
      id: "result",
      title: "Lendo o resultado",
      body: (
        <>
          <p>
            Os cartões trazem os totais do período. Em relatórios de uma direção só (Entradas, Saídas), aparecem total,
            quantidade de lançamentos, o maior grupo e a média por lançamento.
          </p>
          <p>
            A síntese mostra as barras dos maiores valores e a tabela com entradas, saídas, líquido,{" "}
            <strong>% do total</strong> e quantidade.
          </p>
        </>
      ),
    },
    {
      id: "delinquency",
      title: "Inadimplência",
      body: (
        <>
          <p>
            Lista quem tem mensalidade vencida no período, do maior valor para o menor, com responsável, telefone, os
            meses em aberto e há quantos dias está em atraso. Os cartões mostram o percentual de inadimplência sobre o
            previsto.
          </p>
          <p className="muted">Use o CSV para organizar as cobranças.</p>
        </>
      ),
      media: {
        src: "/help/relatorios-inadimplencia.png",
        alt: "Relatório de inadimplência com resumo, valores por ramo e lista de associados",
        caption: "Do maior valor em aberto para o menor.",
      },
    },
    {
      id: "print",
      title: "Imprimir, PDF e CSV",
      body: (
        <>
          <p>
            <strong>Imprimir / PDF</strong> gera o documento com o papel timbrado do grupo: brasão, identificação do
            documento, quadro de saldos, síntese, livro-caixa (se marcado) e rodapé. Para PDF, escolha “Salvar como PDF”
            na janela de impressão. Livro-caixa e Prestação de contas saem com as assinaturas.
          </p>
          <p className="muted">
            <strong>Exportar CSV</strong> baixa a síntese (ou o livro-caixa, se marcado) para planilha.
          </p>
        </>
      ),
      media: {
        src: "/help/relatorios-impressao.png",
        alt: "Versão impressa do relatório de entradas com papel timbrado",
        caption: "Todos os relatórios usam o mesmo padrão de impressão.",
      },
    },
  ],
};
