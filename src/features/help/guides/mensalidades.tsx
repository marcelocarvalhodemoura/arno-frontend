import type { PageGuideContent } from "@/features/help/types";

export const mensalidadesGuide: PageGuideContent = {
  id: "mensalidades",
  title: "Como usar as mensalidades",
  intro:
    "Grade do ano escoteiro (março a novembro): cobrança, taxa do clube, baixa pontual ou com atraso, adiantamento, família, parcela de dívida embutida, recibos e atalho para o caixa.",
  steps: [
    {
      id: "read-grid",
      title: "Totais e grade",
      body: (
        <>
          <p>
            Cards no topo (pagas, pendentes, vencidas, em aberto) seguem os filtros. Cada linha é um associado; as
            colunas são os meses. Célula verde = paga, amarela = no prazo, vermelha = vencida.
          </p>
          <p className="muted">
            Março/abril: demais ramos R$ 60; pioneiro R$ 15 no prazo e R$ 20 com atraso. A partir de maio: cartaz atual,
            com taxa do clube e diluição quando couber. Se houver acordo embutido, o valor da célula já inclui a parcela
            da dívida.
          </p>
        </>
      ),
      media: {
        src: "/help/mensalidades-resumo.png",
        alt: "Cards de resumo das mensalidades",
        caption: "Os totais acompanham o filtro da lista.",
      },
    },
    {
      id: "due-and-filters",
      title: "Vencimento e filtros",
      body: (
        <>
          <p>
            Altere o dia padrão de vencimento e clique em <strong>Aplicar</strong>. Filtre por período, nome, ramo,
            papel e situação do associado.
          </p>
        </>
      ),
      media: {
        src: "/help/mensalidades-filtros.png",
        alt: "Filtros e dia de vencimento",
        caption: "O dia padrão vale para a grade do grupo.",
      },
    },
    {
      id: "charge-bulk",
      title: "Cobrar e taxa do clube em massa",
      body: (
        <>
          <ul>
            <li>
              <strong>Cobrar [mês]</strong> — dispara aviso (e-mail/WhatsApp, se configurados) a quem ainda deve.
            </li>
            <li>
              <strong>Incluir / Remover clube</strong> — aplica ou tira a taxa do clube no mês do período.
            </li>
          </ul>
          <p className="muted">Sem canal configurado nas configurações de disparo, a cobrança não sai do sistema.</p>
        </>
      ),
      media: {
        src: "/help/mensalidades-acoes-massa.png",
        alt: "Botões Incluir clube, Remover clube e Cobrar",
        caption: "Ações em massa usam o mês do controle de período.",
      },
    },
    {
      id: "cell-settle",
      title: "Abrir a célula e baixar",
      body: (
        <>
          <p>Clique numa célula em aberto para:</p>
          <ul>
            <li>Ver valor pontual e com atraso (e parcela de dívida, se embutida)</li>
            <li>Incluir ou remover taxa do clube naquele mês</li>
            <li>Informar a data de pagamento</li>
            <li>
              Marcar <strong>Pagar pontual</strong> ou <strong>Pagar com atraso</strong>
            </li>
            <li>Cobrar de novo ou enviar comprovante (quando já paga)</li>
            <li>
              Abrir o lançamento em <strong>Ver no caixa</strong>
            </li>
          </ul>
        </>
      ),
      media: {
        src: "/help/mensalidades-modal.png",
        alt: "Modal de detalhe da mensalidade",
        caption: "Pontual e atraso usam valores diferentes quando o cartaz prevê.",
      },
    },
    {
      id: "payment-variations",
      title: "Variações de pagamento",
      body: (
        <>
          <p>No modal da célula (ou ao marcar pago no caixa), estas são as combinações usuais:</p>
          <ul>
            <li>
              <strong>Um mês, pontual</strong> — data de pagamento + <strong>Pagar pontual</strong>.
            </li>
            <li>
              <strong>Um mês, com atraso</strong> — mesma tela, <strong>Pagar com atraso</strong> (valor do cartaz
              atrasado).
            </li>
            <li>
              <strong>Adiantamento</strong> — marque em <em>Baixar também outros meses</em> os meses futuros ainda em
              aberto; o total soma tudo. Use pontual ou atraso conforme o combinado com a família.
            </li>
            <li>
              <strong>Atrasados acumulados</strong> — a mesma lista de “outros meses” serve para meses vencidos atrás;
              marque todos que o PIX cobre e baixe de uma vez.
            </li>
            <li>
              <strong>Família / irmãos</strong> — se houver vínculo de irmãos, aparece{" "}
              <em>Baixar também irmão(s) neste mês</em> para o mesmo pagamento da família.
            </li>
            <li>
              <strong>Com parcela de dívida embutida</strong> — o valor da célula já traz mensalidade + parcela do
              acordo (tela Dívidas, modo embutido). Ao baixar a mensalidade, a parcela do acordo também é dada como
              paga.
            </li>
            <li>
              <strong>Dívida à parte</strong> — se o acordo for lançamento separado no caixa, a mensalidade e a parcela
              da dívida são linhas distintas: baixe cada uma (ou rateie o PIX nas duas).
            </li>
            <li>
              <strong>PIX do extrato já pago</strong> — não use só esta tela para “inventar” o crédito. No Fluxo,
              classifique o crédito (Mensalidade + associado) se for um mês; se cobrir vários meses, use{" "}
              <strong>Baixar mensalidades deste Pix</strong> e escolha a competência de cada mês, pontual ou com atraso.
              Detalhes no guia do Fluxo de caixa.
            </li>
          </ul>
          <p className="muted">
            Adiantamento e atraso acumulado usam o mesmo mecanismo de checkboxes; a diferença é só quais meses você
            marca (à frente ou atrás).
          </p>
        </>
      ),
      media: {
        src: "/help/mensalidades-modal.png",
        alt: "Modal com opções de baixar outros meses e irmãos",
        caption: "Marque os meses/irmãos que o mesmo pagamento cobre.",
      },
    },
  ],
};
