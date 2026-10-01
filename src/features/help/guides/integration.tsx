import type { PageGuideContent } from "@/features/help/types";

export const integrationGuide: PageGuideContent = {
  id: "integration",
  title: "Como usar a integração",
  intro:
    "Três caminhos: importar associados, importar extrato (planilha/PDF) ou ligar o Sicredi ao vivo para o Pix entrar no caixa.",
  steps: [
    {
      id: "tabs",
      title: "Escolha a aba",
      body: (
        <>
          <ul>
            <li>
              <strong>Associados</strong> — carga em massa do cadastro
            </li>
            <li>
              <strong>Extrato</strong> — histórico do banco ou modelo da tesouraria
            </li>
            <li>
              <strong>Sicredi ao vivo</strong> — Pix em tempo real, sem arquivo
            </li>
          </ul>
          <p className="muted">Baixe o modelo CSV da aba atual antes de preencher, quando for importação.</p>
        </>
      ),
      media: {
        src: "/help/integration-dropzone.png",
        alt: "Abas Associados, Extrato e Sicredi ao vivo",
        caption: "Cada aba tem fluxo e modelo próprios.",
      },
    },
    {
      id: "members-import",
      title: "Importar associados",
      body: (
        <>
          <p>
            Arraste .csv, .xls ou .xlsx. Confira a amostragem (nome, ramo, papel, mensalidade, ingresso, clube LTC).
            Jovem pode trazer vários responsáveis nas colunas ou em linhas com o mesmo e-mail. Só importe as linhas
            válidas.
          </p>
        </>
      ),
      media: {
        src: "/help/integration-page.png",
        alt: "Zona de importação de associados",
        caption: "Linhas com erro ficam de fora até corrigir o arquivo.",
      },
    },
    {
      id: "statement-import",
      title: "Importar extrato",
      body: (
        <>
          <p>
            Aceita modelo da tesouraria, planilha do banco ou PDF do Sicredi. Linhas do banco entram em geral{" "}
            <strong>já pagas</strong>. O sistema sugere tipo e associado; você ajusta, inclui ou desmarca e grava.
          </p>
          <ul>
            <li>
              <strong>Antes de gravar</strong> — se for mensalidade, marque tipo <strong>Mensalidade</strong> +
              associado. O sistema casa com a mensalidade pendente e dá baixa nela (sem duplicar). Se o valor incluir
              parcela de dívida embutida, use o total que a grade espera para aquele mês.
            </li>
            <li>
              <strong>Vários meses de mensalidade</strong> — grave o crédito e, no Fluxo, use{" "}
              <strong>Baixar mensalidades deste Pix</strong> para escolher os meses (pontual ou com atraso).
            </li>
            <li>
              <strong>Mensalidade + dívida à parte ou família</strong> — grave o crédito e rateie no Fluxo (uma parte
              por associado/rubrica).
            </li>
            <li>
              <strong>Linhas amarelas / sem tipo</strong> — vão ao caixa para Identificar. Lá classifique ou rateie
              (adiantamento, atrasados, família, dívida).
            </li>
          </ul>
          <p className="muted">Classificar na importação evita limpar pendências duplicadas no fluxo de caixa.</p>
        </>
      ),
      media: {
        src: "/help/integration-extrato.png",
        alt: "Aba Extrato com zona de importação",
        caption: "Desmarque o que não deve entrar nesta importação.",
      },
    },
    {
      id: "identify-rules",
      title: "Um PIX, um motivo",
      body: (
        <>
          <ol>
            <li>
              <strong>Um PIX, um motivo</strong> — QR Codes separados, linhas já classificadas.
            </li>
            <li>
              <strong>Um PIX com a soma</strong> — ratear no caixa.
            </li>
            <li>
              <strong>Cartão</strong> — identifique pela maquininha; liquidação vem líquida.
            </li>
            <li>
              <strong>Comprovante</strong> — casa com o extrato; não lança sozinho.
            </li>
          </ol>
        </>
      ),
      media: {
        src: "/help/cash-flow-rateio.png",
        alt: "Rateio no caixa após o crédito do banco",
        caption: "A soma das partes tem de bater com o valor do banco.",
      },
    },
    {
      id: "sicredi-live",
      title: "Sicredi ao vivo",
      body: (
        <>
          <p>
            Configure as credenciais (ou use mock no .env). Com a conta ligada, os Pix entram no caixa; o que vier sem
            tipo fica na fila de identificação. O fluxo de caixa sincroniza em segundo plano — o controle da conexão
            fica nesta aba.
          </p>
        </>
      ),
      media: {
        src: "/help/integration-sicredi.png",
        alt: "Painel Sicredi ao vivo",
        caption: "Ligue e monitore aqui; o dia a dia fica no caixa.",
      },
    },
  ],
};
