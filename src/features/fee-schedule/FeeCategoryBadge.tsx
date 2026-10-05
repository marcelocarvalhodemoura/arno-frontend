import { feeCategoryOf, type MensalidadeProfile } from "@/domain";

type Props = {
  profile: MensalidadeProfile;
  /** Mês da mensalidade (YYYY-MM ou data); sem valor = mês atual. */
  when?: string | null;
  /** Mostra também o período da composição ("A partir de mai/2026"). */
  showPeriod?: boolean;
};

/** Categoria da composição em que a mensalidade do associado cai (com as partes na dica). */
export default function FeeCategoryBadge({ profile, when, showPeriod = false }: Props) {
  const category = feeCategoryOf(profile, when);
  const title = [
    `Composição da mensalidade: ${category.label}`,
    `Período: ${category.periodLabel}`,
    category.breakdown,
    category.pendingSplit ? "Divisão ainda a confirmar pela tesouraria" : "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <span className="fee-category">
      <span className={`fee-category__badge is-${category.key}`} title={title}>
        {category.label}
        {category.pendingSplit ? <span aria-label="divisão a confirmar"> *</span> : null}
      </span>
      {showPeriod && category.key !== "exempt" ? (
        <small className="muted fee-category__period">{category.periodLabel}</small>
      ) : null}
    </span>
  );
}
