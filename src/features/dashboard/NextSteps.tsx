import { useNavigate } from "react-router-dom";
import type { NextSteps as NextStepsData } from "@/domain";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, MONTHS } from "@/shared/lib/format";
import { writeIdentifyFlag } from "@/core/session/identify-flag";

export type NextStepKey = "overdue" | "unidentified" | "suggestions" | "duplicates" | "sync" | "closing" | "nextYear";

type Card = {
  key: NextStepKey;
  tone: "bad" | "warn" | "info" | "ok";
  kicker: string;
  value: string;
  text: string;
  action: string;
  go: () => void;
};

type Props = {
  /** Na tela do caixa, alguns cartões abrem a revisão ali mesmo em vez de navegar. */
  actions?: Partial<Record<NextStepKey, () => void>>;
  /** Muda para recarregar os números depois de uma ação. */
  refreshKey?: number;
  /** Cartões que a tela já mostra de outro jeito. */
  hide?: NextStepKey[];
};

/** Pendências da tesouraria, da mais urgente para a menos. Some o que está em dia. */
export default function NextSteps({ actions = {}, refreshKey = 0, hide = [] }: Props) {
  const navigate = useNavigate();
  const steps = useFetch<NextStepsData>(`/next-steps?k=${refreshKey}`);
  const data = steps.data;
  if (!data) return null;

  const run = (key: NextStepKey, fallback: () => void) => actions[key] ?? fallback;
  const cards: Card[] = [];
  if (data.overdue.count) {
    cards.push({
      key: "overdue",
      tone: "bad",
      kicker: "Vencidas",
      value: String(data.overdue.count),
      text: `mensalidades sem pagamento (${brl(data.overdue.amount)})`,
      action: "Ver na grade",
      go: run("overdue", () => navigate("/mensalidades")),
    });
  }
  if (data.suggestions.count) {
    cards.push({
      key: "suggestions",
      tone: "warn",
      kicker: "Conciliar",
      value: String(data.suggestions.count),
      text: "Pix com mensalidade sugerida para confirmar",
      action: "Revisar sugestões",
      go: run("suggestions", () => navigate("/fluxo")),
    });
  }
  if (data.unidentified.count) {
    cards.push({
      key: "unidentified",
      tone: "warn",
      kicker: "Identificar",
      value: String(data.unidentified.count),
      text: "créditos do extrato sem tipo",
      action: "Identificar agora",
      go: run("unidentified", () => {
        writeIdentifyFlag();
        navigate("/fluxo");
      }),
    });
  }
  if (data.duplicates.count) {
    cards.push({
      key: "duplicates",
      tone: "warn",
      kicker: "Duplicados",
      value: String(data.duplicates.count),
      text: "possíveis lançamentos repetidos",
      action: "Revisar",
      go: run("duplicates", () => navigate("/fluxo")),
    });
  }
  if (data.closing.pending) {
    const month = Number(data.closing.yearMonth.slice(5, 7));
    cards.push({
      key: "closing",
      tone: "info",
      kicker: "Fechamento",
      value: `${MONTHS[month - 1]}`,
      text: "mês anterior ainda aberto; confira e feche",
      action: "Ir para o mês",
      go: run("closing", () => navigate("/fluxo")),
    });
  }
  if (data.sync.configured && (data.sync.days === null || data.sync.days >= 3)) {
    cards.push({
      key: "sync",
      tone: "info",
      kicker: "Extrato",
      value: data.sync.days === null ? "nunca" : `${data.sync.days} dias`,
      text: "desde a última sincronização Sicredi",
      action: "Sincronizar",
      go: run("sync", () => navigate("/integracao")),
    });
  }
  if (!data.nextYear.generated && new Date().getMonth() >= 10) {
    cards.push({
      key: "nextYear",
      tone: "info",
      kicker: "Próximo ano",
      value: String(data.nextYear.year),
      text: "cobranças de mensalidade ainda não geradas",
      action: "Abrir a grade",
      go: run("nextYear", () => navigate("/mensalidades")),
    });
  }

  const visible = cards.filter((card) => !hide.includes(card.key));
  return (
    <section className="next-steps" aria-label="Próximos passos">
      {visible.length === 0 ? (
        <div className="next-step is-ok">
          <span className="next-step__kicker">Em dia</span>
          <p>Nenhuma pendência: mensalidades, extrato e conciliação estão em ordem.</p>
        </div>
      ) : (
        visible.map((card) => (
          <div key={card.key} className={`next-step is-${card.tone}`}>
            <span className="next-step__kicker">{card.kicker}</span>
            <strong className="next-step__value">{card.value}</strong>
            <p>{card.text}</p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={card.go}>
              {card.action}
            </button>
          </div>
        ))
      )}
    </section>
  );
}
