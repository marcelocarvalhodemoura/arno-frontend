import type { PageGuideContent } from "@/features/help/types";

export const feesGuide: PageGuideContent = {
  id: "fees",
  title: "Como usar o cadastro de taxas",
  intro:
    "Valores de referência para reconhecer pagamentos no extrato bancário. Este cadastro não altera o cálculo da mensalidade.",
  steps: [
    {
      id: "list",
      title: "Para que serve",
      body: (
        <>
          <p>
            Na importação do extrato, quando um Pix de entrada é de um associado identificado e o tipo ainda não foi
            reconhecido, o sistema procura aqui uma taxa com o mesmo valor. Se existir um{" "}
            <strong>Tipo de movimentação</strong> com exatamente o mesmo nome da taxa, o Pix é sugerido nesse tipo.
          </p>
          <p>
            Exemplo: taxa <strong>Acampamento</strong> de R$ 150,00 e tipo de movimentação <strong>Acampamento</strong>{" "}
            — um Pix de R$ 150,00 de um associado vem sugerido como Acampamento.
          </p>
        </>
      ),
    },
    {
      id: "create",
      title: "Nova ou alterar taxa",
      body: (
        <>
          <p>
            Em <strong>Nova taxa</strong> ou ao editar: informe o nome e o valor. Para a sugestão funcionar, use o mesmo
            nome de um tipo de movimentação ativo.
          </p>
        </>
      ),
    },
    {
      id: "care",
      title: "Mensalidade não é configurada aqui",
      body: (
        <>
          <p>
            As taxas de mensalidade listadas são só referência. Alterar ou excluir esses valores{" "}
            <strong>não muda</strong> a cobrança da mensalidade, o repasse ao clube, a taxa do lanche nem a caixinha dos
            ramos. Os valores da mensalidade ficam na tela <strong>Composição da mensalidade</strong>.
          </p>
        </>
      ),
    },
  ],
};
