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
            PIX e importações do extrato chegam em geral <strong>já pagos</strong> e às vezes sem rubrica. O banner
            lista o que falta. Em <strong>Identificar agora</strong> você percorre a fila e define tipo, valor, datas,
            associado e ramo.
          </p>
          <p className="muted">
            Não use “Marcar como pago” nessas linhas: elas já estão pagas. A baixa da mensalidade na grade depende de
            classificar o crédito (veja o passo seguinte).
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
      id: "bank-to-mensalidade",
      title: "Extrato pago → baixar mensalidade",
      body: (
        <>
          <p>
            Quando o crédito do banco já entrou <strong>pago</strong> e você precisa amarrar à mensalidade (e
            variações):
          </p>
          <ul>
            <li>
              <strong>Um mês</strong> — Identificar/Alterar: tipo <strong>Mensalidade</strong>, associado, mantenha{" "}
              <strong>Pago</strong> e a data do extrato. Se sobrar mensalidade pendente duplicada daquele mês, exclua só
              a pendente.
            </li>
            <li>
              <strong>Adiantamento ou vários meses atrasados</strong> — use o botão{" "}
              <strong>Baixar mensalidades deste Pix</strong> (ícone de calendário) na linha do crédito. Escolha o
              associado, <strong>Pontual</strong> ou <strong>Com atraso</strong> e marque os meses (2 ou mais) que o PIX
              cobre. Cada parte vai para a competência do mês marcado, independente da data do PIX, que fica só como
              data de pagamento. A soma precisa ser igual ao PIX; as pendências desses meses são substituídas
              automaticamente.
            </li>
            <li>
              <strong>Mensalidade + parcela de dívida embutida</strong> — o valor esperado na grade já inclui a parcela.
              Classifique o PIX como Mensalidade (valor total) ou rateie se o banco trouxe só um valor agregado com
              outros itens.
            </li>
            <li>
              <strong>Mensalidade + dívida à parte</strong> — rateie: uma parte Mensalidade e outra Acordo/dívida (ou
              baixe a mensalidade e a linha do acordo separadamente).
            </li>
            <li>
              <strong>Mês de cada parte Mensalidade</strong> — no <strong>Ratear</strong>, toda parte do tipo
              Mensalidade exige o associado e o <strong>mês que ela quita</strong> (a lista mostra só as cobranças
              pendentes e vencidas que já existem para o associado). É esse mês que fica pago na tela Mensalidades, não
              o mês do PIX; a pendência daquele mês é substituída.
            </li>
            <li>
              <strong>Família no mesmo PIX</strong> — rateie uma parte por associado (irmão), tipo Mensalidade, ou use a
              baixa em lote na tela Mensalidades se ainda forem lançamentos pendentes.
            </li>
          </ul>
          <p className="muted">
            O botão de calendário só aparece em créditos pagos, do tipo Mensalidade ou A identificar, ainda não rateados
            e cujo valor não corresponde a uma única mensalidade do associado. Para um mês só, basta
            Identificar/Alterar.
          </p>
          <p className="muted">
            Preferível: na Integração, antes de gravar, já marcar Mensalidade + associado — o sistema casa com a
            pendente e dá baixa sem duplicar. Não use “Marcar como pago” no crédito do extrato: ele já está pago.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-tabela.png",
        alt: "Tabela de lançamentos do caixa",
        caption:
          "Classifique o crédito pago ou baixe vários meses pelo botão de calendário; não confunda com Marcar como pago.",
      },
    },
    {
      id: "advance-and-debt",
      title: "Adiantamento, atraso e dívida no caixa",
      body: (
        <>
          <p>
            Se a mensalidade ainda está <strong>pendente</strong> no caixa (gerada pela grade), use{" "}
            <strong>Marcar como pago</strong>:
          </p>
          <ul>
            <li>
              Informe a data e, em <em>Baixar também outros meses (adiantamento)</em>, marque meses futuros ou atrasados
              que o mesmo pagamento cobre — o total aparece no modal.
            </li>
            <li>
              Linhas com marca de <strong>acordo embutido</strong> ou <strong>acordo / dívida</strong> mostram que há
              parcela de dívida ligada; ao baixar a mensalidade embutida, a parcela acompanha.
            </li>
          </ul>
          <p className="muted">
            Para forçar valor pontual vs atraso em lote, prefira a tela Mensalidades (Pagar pontual / Pagar com atraso).
            Acordos novos e quitação avulsa ficam na tela Dívidas.
          </p>
        </>
      ),
      media: {
        src: "/help/cash-flow-rateio.png",
        alt: "Modal de rateio ou confirmação de pagamento",
        caption: "Adiantamento no modal de pago; vários motivos no rateio.",
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
              <strong>Marcar como pago</strong> — para lançamentos ainda pendentes (ex.: mensalidade da grade). Dá para
              incluir outros meses (adiantamento ou atrasados) e o total aparece no modal. No crédito do extrato que já
              veio pago, use Identificar/Alterar ou Ratear, não este botão.
            </li>
            <li>
              <strong>Alterar</strong> — edita todos os campos (incluindo classificar extrato sem tipo).
            </li>
            <li>
              <strong>Anexar nota</strong> — foto ou PDF de comprovante.
            </li>
            <li>
              <strong>Baixar mensalidades deste Pix</strong> (calendário) — só em crédito pago de mensalidade que cobre
              vários meses (adiantamento ou atrasados): você escolhe os meses, pontual ou com atraso, e o sistema rateia
              e dá baixa na grade.
            </li>
            <li>
              <strong>Ratear</strong> — parte um crédito em várias rubricas/associados (família, mensalidade + dívida à
              parte); a soma deve bater com o total. Partes do tipo Mensalidade pedem o mês que quitam.
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
