import type { PageGuideContent } from "@/features/help/types";

export const mensalidadesGuide: PageGuideContent = {
  id: "mensalidades",
  title: "Como usar as mensalidades",
  intro:
    "Grade do ano escoteiro (março a novembro): cobrança, taxa do clube, baixa pontual ou com atraso, recibos e atalho para o caixa.",
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
            Março/abril: valores de início. A partir de maio: cartaz atual, com taxa do clube e diluição quando couber.
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
          <p>Clique numa célula para:</p>
          <ul>
            <li>Ver valor pontual e com atraso</li>
            <li>Incluir ou remover taxa do clube naquele mês</li>
            <li>Reenviar cobrança ou recibo</li>
            <li>Informar a data e marcar pago (pontual ou atrasado)</li>
            <li>Baixar juntos outros em aberto no mesmo mês, se houver</li>
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
  ],
};
