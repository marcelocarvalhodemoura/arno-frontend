import type { PageGuideContent } from "@/features/help/types";

export const comprovantesGuide: PageGuideContent = {
  id: "comprovantes",
  title: "Como conferir os comprovantes",
  intro:
    "As famílias mandam o comprovante (PDF ou print) para o WhatsApp da tesouraria. O sistema lê o arquivo, procura o crédito no extrato e, quando tem certeza, dá baixa sozinho. O que sobra fica aqui para conferir.",
  steps: [
    {
      id: "auto",
      title: "Quando a baixa é automática",
      body: (
        <>
          <p>
            Só quando o <strong>ID do Pix</strong> do comprovante é o mesmo de um crédito do extrato, o telefone está no
            cadastro e existe <strong>uma</strong> mensalidade em aberto com aquele valor. A família recebe a
            confirmação no WhatsApp.
          </p>
        </>
      ),
    },
    {
      id: "tabs",
      title: "As abas",
      body: (
        <>
          <p>
            <strong>Para conferir</strong>: TED, depósito, print sem ID do Pix, telefone sem cadastro, irmãos ou valor
            diferente da mensalidade. <strong>Aguardando extrato</strong>: o Pix ainda não apareceu na sincronização do
            Sicredi; o sistema tenta de novo a cada sincronização e, depois de 10 dias, manda para conferência.
          </p>
        </>
      ),
    },
    {
      id: "review",
      title: "Conferir",
      body: (
        <>
          <p>
            Clique em <strong>Conferir</strong>, escolha o crédito do extrato e a mensalidade. O sistema já marca o mês
            mais antigo com o valor igual ao do Pix. Se a família pagou <strong>vários meses de uma vez</strong>, use{" "}
            <strong>Pix de vários meses</strong> para ratear.
          </p>
          <p className="muted">
            Se a família respondeu algo depois do comprovante (por exemplo, "é do Pedro"), a mensagem aparece junto do
            motivo.
          </p>
        </>
      ),
    },
    {
      id: "discard",
      title: "Descartar",
      body: (
        <>
          <p>
            Para arquivo errado, duplicado ou que não é pagamento. Descartar não mexe no caixa: o comprovante só sai da
            fila.
          </p>
        </>
      ),
    },
  ],
};
