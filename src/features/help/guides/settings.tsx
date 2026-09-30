import type { PageGuideContent } from "@/features/help/types";

export const settingsGuide: PageGuideContent = {
  id: "settings",
  title: "Como usar configurações e disparos",
  intro:
    "Nome do grupo, saldo inicial, dia de vencimento da mensalidade e status dos canais de cobrança (e-mail e WhatsApp).",
  steps: [
    {
      id: "group",
      title: "Grupo e saldo inicial",
      body: (
        <>
          <ul>
            <li>
              <strong>Nome do grupo</strong> — aparece nos e-mails de cobrança e comprovante
            </li>
            <li>
              <strong>Saldo inicial</strong> — entra no livro-caixa e no painel
            </li>
            <li>
              <strong>Dia de vencimento</strong> — padrão da grade de mensalidades (1–31)
            </li>
          </ul>
          <p className="muted">Salve para aplicar. Só administrador altera estas opções.</p>
        </>
      ),
    },
    {
      id: "channels",
      title: "Canais de cobrança",
      body: (
        <>
          <p>
            O painel mostra se e-mail e WhatsApp estão prontos e quantos disparos estão na fila. E-mail usa MAIL_HOST /
            MAIL_FROM no servidor; WhatsApp usa o token cadastrado. Com MAIL_MOCK=1 os envios são gravados sem sair da
            máquina.
          </p>
        </>
      ),
    },
    {
      id: "log",
      title: "Últimos disparos",
      body: (
        <>
          <p>
            A tabela lista cobranças e comprovantes recentes: canal, destinatário, situação (na fila, enviado, falhou,
            não enviado) e erro, se houver. Use para conferir se o aviso saiu após “Cobrar” nas mensalidades.
          </p>
        </>
      ),
    },
  ],
};
