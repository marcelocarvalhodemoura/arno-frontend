import type { PageGuideContent } from "@/features/help/types";

export const usersGuide: PageGuideContent = {
  id: "users",
  title: "Como usar o controle de usuários",
  intro:
    "Cadastro de quem acessa a tesouraria: super admin, administradores e tesoureiros, com ativação e troca de senha.",
  steps: [
    {
      id: "roles",
      title: "Papéis",
      body: (
        <>
          <ul>
            <li>
              <strong>Super admin</strong> — tudo do administrador e mais a <strong>Auditoria</strong> (uso do sistema
              por usuário). Só um super admin cria ou altera outro super admin.
            </li>
            <li>
              <strong>Administrador</strong> — painel, relatórios, usuários, previsão, configurações e o restante.
            </li>
            <li>
              <strong>Tesoureiro</strong> — caixa, mensalidades, dívidas, integração, tipos, taxas, associados e contas.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "create",
      title: "Novo usuário",
      body: (
        <>
          <p>
            Informe nome, usuário de login, e-mail, papel e senha. O login usa o <strong>usuário</strong> cadastrado
            (não o nome) ou o e-mail.
          </p>
        </>
      ),
    },
    {
      id: "manage",
      title: "Alterar, desativar e senha",
      body: (
        <>
          <p>
            Edite dados e papel. Desative quem não deve mais entrar (pode reativar depois). Ao alterar senha, o sistema
            pede a senha atual do administrador logado, quando exigido.
          </p>
        </>
      ),
    },
    {
      id: "filters",
      title: "Filtros",
      body: (
        <>
          <p>Busque por nome, usuário ou e-mail. Filtre por papel e situação (ativo/inativo).</p>
        </>
      ),
    },
  ],
};
