import { FaMinus, FaStore, FaUsers } from "react-icons/fa";
import type { MovementAudience } from "@/domain";
import { audienceLabel } from "@/shared/lib/format";

const AUDIENCE_UI: Record<MovementAudience, { icon: typeof FaUsers; hint: string }> = {
  internal: { icon: FaUsers, hint: "Associados (acampamento, bivaque…): entradas pedem quem pagou" },
  external: { icon: FaStore, hint: "Comunidade (festival, pastelada…): o relatório mostra o resultado do evento" },
  general: { icon: FaMinus, hint: "Sem regra de público" },
};

/** Destaca o público do tipo de movimentação: interno, externo ou não se aplica. */
export default function AudienceBadge({ audience }: { audience?: MovementAudience | null }) {
  const key = audience ?? "general";
  const { icon: Icon, hint } = AUDIENCE_UI[key];
  return (
    <span className={`badge badge-audience badge-audience-${key}`} title={hint}>
      <Icon aria-hidden="true" />
      {audienceLabel(key)}
    </span>
  );
}
