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
          <p>À esquerda ficam os relatórios, separados pelo que você quer fazer. Clicar já mostra o resultado.</p>
          <ul>
            <li>
              <strong>Prestar contas</strong> — Assembleia (saldos, para onde foi cada real e quem está devendo) e
              Comissão fiscal (livro-caixa com assinaturas).
            </li>
            <li>
              <strong>Acompanhar o caixa</strong> — O que entrou e saiu (por tipo de movimentação ou meio de pagamento)
              e Evolução mensal.
            </li>
            <li>
              <strong>Ramos e associados</strong> — Extrato dos ramos, Pagamentos por associado e Quem está devendo.
            </li>
            <li>
              <strong>Conferir</strong> — Conferência das mensalidades e Lançamentos a identificar.
            </li>
            <li>
              <strong>Montar relatório</strong> — Relatório personalizado: você escolhe o que mostrar, como agrupar e os
              filtros (ramos, tipos de movimentação, associados) e pode salvar como modelo.
            </li>
          </ul>
          <p className="muted">Os itens com ↗ abrem a tela própria do relatório.</p>
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
      title: "Período, ver por e filtros",
      body: (
        <>
          <p>
            Use os atalhos (<em>Este mês</em>, <em>Mês anterior</em>, <em>Ano até hoje</em>, semestres, ano anterior) ou
            digite as datas. Em <strong>O que entrou e saiu</strong>, escolha <em>Ver por</em> (tipo de movimentação ou
            meio de pagamento) e <em>Mostrar</em> (entradas e saídas, só entradas ou só saídas).
          </p>
          <p>
            Em <strong>Filtros</strong> você restringe ramos e tipos de movimentação; o resumo ao lado mostra o que está
            valendo. O relatório se atualiza sozinho a cada mudança.
          </p>
          <p className="muted">
            Marque <em>Incluir o livro-caixa detalhado</em> para ver e imprimir lançamento a lançamento, com saldo
            acumulado. Quanto cada ramo tem fica no <strong>Extrato dos ramos</strong>, o mesmo número usado na
            prestação de contas da assembleia.
          </p>
        </>
      ),
    },
    {
      id: "builder",
      title: "Relatório personalizado e modelos",
      body: (
        <>
          <p>
            Siga os passos numerados: período, o que mostrar, agrupar por, filtrar e detalhe. O título do documento se
            monta sozinho a partir das escolhas.
          </p>
          <p>
            Para repetir o mesmo relatório depois, dê um nome e clique em <strong>Salvar modelo</strong>. Em{" "}
            <strong>Modelos salvos</strong> você abre, atualiza com as escolhas atuais ou apaga um modelo. Os modelos
            ficam disponíveis para todos os administradores.
          </p>
          <p className="muted">
            Salvo com um atalho de período (ex.: “Ano até hoje”), o modelo recalcula as datas ao ser aberto; com datas
            digitadas, abre sempre no mesmo período.
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
            A primeira linha resume o período numa frase: quanto entrou, quanto saiu, quanto sobrou e com quanto o caixa
            terminou. Os cartões trazem os mesmos totais; mostrando só entradas ou só saídas, aparecem total, quantidade
            de lançamentos, o maior grupo e a média por lançamento.
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
      title: "Quem está devendo",
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
