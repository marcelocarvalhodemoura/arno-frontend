import type { PageGuideContent } from "@/features/help/types";

export const membersGuide: PageGuideContent = {
  id: "members",
  title: "Como usar o cadastro de associados",
  intro:
    "Cadastro de jovens, escotistas, dirigentes e Clube da Flor de Lis: responsáveis, contas de pagamento, descontos familiares e situação ativo/inativo.",
  steps: [
    {
      id: "find",
      title: "Buscar e filtrar",
      body: (
        <>
          <p>
            Busque por nome, e-mail, telefone ou responsável. Filtre por ramo, papel (jovem, escotista, dirigente,
            clube), situação (ativo/inativo) e Clube LTC.
          </p>
        </>
      ),
      media: {
        src: "/help/members-filtros.png",
        alt: "Barra de filtros da lista de associados",
        caption: "Combine busca e filtros na lista longa.",
      },
    },
    {
      id: "create",
      title: "Novo associado",
      body: (
        <>
          <p>
            Em <strong>Novo associado</strong>: nome, e-mail, telefone, ramo, papel, data de cadastro e Clube LTC. Jovem
            exige pelo menos um responsável (parentesco, telefone e e-mail opcionais).
          </p>
          <p>
            Quem paga mensalidade pode ter desconto familiar: filho de chefe ou irmãos no grupo (não os dois). No caso
            de irmãos, vincule os outros associados do cadastro.
          </p>
          <p className="muted">A mensalidade exibida segue a tabela do grupo (pontual e com atraso).</p>
        </>
      ),
      media: {
        src: "/help/members-form.png",
        alt: "Formulário de novo associado com responsáveis",
        caption: "Responsáveis entram no cadastro e nos lançamentos.",
      },
    },
    {
      id: "accounts",
      title: "Contas de pagamento",
      body: (
        <>
          <p>
            O ícone de carteira abre as contas do associado: titular, quem paga (próprio ou responsável), parentesco,
            CPF, Pix, banco, agência e conta. Marque a conta principal.
          </p>
          <p className="muted">
            Cadastre o nome como costuma aparecer no Pix ou no cartão para facilitar a conciliação.
          </p>
        </>
      ),
      media: {
        src: "/help/members-contas.png",
        alt: "Modal de contas do associado",
        caption: "Sem conta, o extrato fica mais difícil de casar.",
      },
    },
    {
      id: "status",
      title: "Editar, desativar ou excluir",
      body: (
        <>
          <ul>
            <li>
              <strong>Alterar</strong> — atualiza dados, responsáveis e desconto.
            </li>
            <li>
              <strong>Desativar</strong> — cancela mensalidades dos meses seguintes; o histórico permanece.
            </li>
            <li>
              <strong>Reativar</strong> — devolve o associado às cobranças do ano.
            </li>
            <li>
              <strong>Excluir</strong> — só quando não houver histórico que precise preservar.
            </li>
          </ul>
        </>
      ),
      media: {
        src: "/help/members-acoes.png",
        alt: "Linha da tabela de associados",
        caption: "Ações ficam à direita de cada linha.",
      },
    },
  ],
};
