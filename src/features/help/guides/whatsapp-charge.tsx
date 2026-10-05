import type { PageGuideContent } from "@/features/help/types";

export const whatsappChargeGuide: PageGuideContent = {
  id: "whatsapp-charge",
  title: "Como usar a cobrança no WhatsApp",
  intro:
    "A tela monta a mensagem de cada família e abre o WhatsApp com o texto pronto. Quem envia é a tesouraria, do próprio WhatsApp, por isso não há custo nem risco de bloqueio do número.",
  steps: [
    {
      id: "modes",
      title: "Em atraso ou vencendo",
      body: (
        <>
          <p>
            <strong>Em atraso</strong> lista as mensalidades vencidas e não pagas, já com o{" "}
            <strong>acréscimo por atraso</strong> de cada mês. <strong>Vencendo este mês</strong> lembra a mensalidade
            do mês atual, com o valor pontual e o valor depois do vencimento.
          </p>
        </>
      ),
    },
    {
      id: "send",
      title: "Enviar",
      body: (
        <>
          <p>
            Clique no botão do contato (mãe, pai, responsável ou o próprio associado). O WhatsApp abre com a mensagem e
            o <strong>Pix copia e cola com o valor</strong>. Confira e aperte enviar.
          </p>
          <p className="muted">
            Use o WhatsApp da tesouraria no navegador (WhatsApp Web) ou no celular. O clique já registra a cobrança no
            histórico, em <strong>Última cobrança</strong>.
          </p>
        </>
      ),
    },
    {
      id: "reply",
      title: "Quando a família responde",
      body: (
        <>
          <p>
            Se a família responder (por exemplo, com o comprovante), abre a janela gratuita de 24 h do WhatsApp. Nesse
            período, o recibo automático também pode sair pelo WhatsApp. Fora dela, o sistema envia por e-mail.
          </p>
        </>
      ),
    },
  ],
};
