import type { PageGuideContent } from "@/features/help/types";

export const auditGuide: PageGuideContent = {
  id: "audit",
  title: "Como usar a auditoria",
  intro: "Visão de alto nível do uso do sistema, só para o super admin.",
  steps: [
    {
      id: "overview",
      title: "O que aparece",
      body: (
        <>
          <ul>
            <li>
              <strong>Cartões</strong> — usuários ativos, telas abertas, ações que gravam e ações com erro no período.
            </li>
            <li>
              <strong>Atividade por dia</strong> — telas abertas (azul) e ações (amarelo).
            </li>
            <li>
              <strong>Interações por usuário</strong> — telas, ações, entradas no sistema, participação e última
              atividade.
            </li>
            <li>
              <strong>Telas mais usadas</strong>, <strong>ações mais frequentes</strong> e os{" "}
              <strong>últimos eventos</strong>.
            </li>
          </ul>
          <p className="muted">
            Leituras não entram; contam telas abertas, ações que gravam (lançar, alterar, excluir, baixar, conciliar…) e
            entradas no sistema. Os registros ficam guardados por cerca de 13 meses.
          </p>
        </>
      ),
      media: {
        src: "/help/auditoria.png",
        alt: "Auditoria com cartões, atividade por dia, interações por usuário e telas mais usadas",
        caption: "Escolha 7 dias, 30 dias, 90 dias ou 12 meses no topo.",
      },
    },
  ],
};
