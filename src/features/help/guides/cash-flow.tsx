import type { PageGuideContent } from "@/features/help/types";

export const cashFlowGuide: PageGuideContent = {
  id: "cash-flow",
  title: "Como usar o fluxo de caixa",
  intro:
    "Livro-caixa do grupo: entradas e saídas do período, com status de pagamento, conciliação, rateio e notas. O Pix do Sicredi chega pela tela Integrações (sincronização automática em segundo plano quando a conta está ligada).",
  steps: [
    {
      id: "period-and-stats",
      title: "Período e saldos",
      body: (
        <>
          <p>
            O controle de período (mês/ano no topo) define o recorte. Os cards mostram saldo inicial, entradas, saídas e
            saldo atual desse intervalo — não o extrato bancário inteiro.
          </p>
          <p className="muted">
            Cores: pago em verde, pendente em amarelo, vencido em vermelho. Tag azul = ainda sem conciliar.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-saldo.png",
        alt: "Cartões de saldo no topo da tela de caixa",
        caption: "Os cards respondem ao mês/ano selecionados.",
      },
    },
    {
      id: "manual",
      title: "Lançamento manual",
      body: (
        <>
          <p>
            Use <strong>Lançamento manual</strong> para saídas, acordos, cantina, cantina/lanche e qualquer movimento
            que não veio do extrato. Informe tipo, natureza, valor, datas, ramo, método e, se couber, associado ou
            responsável.
          </p>
          <p className="muted">
            Créditos do banco entram pela Integração (Sicredi ou importação). Nesta tela o foco é classificar, editar e
            conciliar.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-header.png",
        alt: "Cabeçalho com Como usar e Lançamento manual",
        caption: "Ação principal do caixa fica no cabeçalho.",
      },
    },
    {
      id: "identify",
      title: "Identificar linhas sem tipo",
      body: (
        <>
          <p>
            PIX e importações podem chegar sem rubrica. O banner lista o que falta. Em{" "}
            <strong>Identificar agora</strong> você percorre a fila e define tipo, valor, datas, associado e ramo.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-banner.png",
        alt: "Banner de lançamentos sem tipo definido",
        caption: "Quanto mais cedo identificar, mais confiável o saldo.",
      },
    },
    {
      id: "filters",
      title: "Filtros da lista",
      body: (
        <>
          <p>Na barra de filtros você pode combinar:</p>
          <ul>
            <li>Busca por descrição, associado ou tipo</li>
            <li>Entrada / saída</li>
            <li>Natureza (fixa ou variável)</li>
            <li>Ramo e tipo de movimentação</li>
            <li>Conciliação (conciliado ou não)</li>
            <li>Datas de vencimento e pagamento</li>
            <li>Com ou sem rateio</li>
          </ul>
        </>
      ),
    },
    {
      id: "row-actions",
      title: "Ações em cada linha",
      body: (
        <>
          <ul>
            <li>
              <strong>Marcar como pago</strong> — baixa o lançamento; em mensalidade dá para incluir outros meses em
              aberto do mesmo associado (adiantamento).
            </li>
            <li>
              <strong>Alterar</strong> — edita todos os campos do lançamento.
            </li>
            <li>
              <strong>Anexar nota</strong> — foto ou PDF de comprovante para conciliação.
            </li>
            <li>
              <strong>Ratear</strong> — parte um crédito (ou saída) em várias rubricas/associados; a soma deve bater com
              o total.
            </li>
            <li>
              <strong>Excluir</strong> — remove o lançamento (conforme permissão).
            </li>
          </ul>
          <p className="muted">Linhas rateadas aparecem em sanfona: o valor original e as partes ao expandir.</p>
        </>
      ),
      media: {
        src: "/help/cash-flow-tabela.png",
        alt: "Tabela de lançamentos com ações por linha",
        caption: "Ícones à direita de cada registro.",
      },
    },
    {
      id: "one-pix-one-reason",
      title: "Um PIX, um motivo",
      body: (
        <>
          <p>
            O saldo só é confiável com o crédito no banco. Vários motivos no mesmo dia pedem PIX separados — ou um único
            crédito rateado aqui.
          </p>
          <ol>
            <li>
              <strong>Um PIX, um motivo</strong> — três QR Codes, três linhas já classificadas.
            </li>
            <li>
              <strong>Um PIX com a soma</strong> — ratear nas partes (associado, rubrica, valor).
            </li>
            <li>
              <strong>Cartão</strong> — identifique pela maquininha; a liquidação no Sicredi vem líquida depois.
            </li>
            <li>
              <strong>Comprovante</strong> — casa com a linha do extrato; não lança sozinho.
            </li>
          </ol>
        </>
      ),
      media: {
        src: "/help/cash-flow-rateio.png",
        alt: "Modal de rateio de lançamento",
        caption: "A soma das partes tem de bater centavo a centavo com o banco.",
      },
    },
  ],
};
