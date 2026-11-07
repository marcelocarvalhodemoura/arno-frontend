import { BRANCH_LABELS, type BranchId } from "@/domain";
import { brl } from "@/shared/lib/format";

/** Divisão da mensalidade em fundos (espelho de MensalidadeFunds do backend). */
export type MensalidadeFunds = {
  memberBranch: string;
  groupCash: number;
  operational: number;
  dilution: number;
  lateFee: number;
  arrears: number;
  branch: number;
  snack: number;
  club: number;
  difference: number;
  pendingSplit: boolean;
  preview: boolean;
};

export type FundPart = { key: string; label: string; amount: number; hint?: string };

/** Partes da mensalidade, na ordem do quadro; partes zeradas ficam de fora. */
export function fundParts(funds: MensalidadeFunds): FundPart[] {
  const groupHint = [
    `operacional ${brl(funds.operational)}`,
    funds.dilution ? `diluição ${brl(funds.dilution)}` : "",
    funds.lateFee ? `atraso ${brl(funds.lateFee)}` : "",
    funds.arrears ? `dívida ${brl(funds.arrears)}` : "",
  ]
    .filter(Boolean)
    .join(" + ");
  const parts: FundPart[] = [
    { key: "group", label: "Operacional (caixa do grupo)", amount: funds.groupCash, hint: groupHint },
    {
      key: "branch",
      label: `Caixinha ${BRANCH_LABELS[funds.memberBranch as BranchId] ?? funds.memberBranch}`,
      amount: funds.branch,
    },
    { key: "snack", label: "Lanche", amount: funds.snack },
    { key: "club", label: "Clube", amount: funds.club, hint: "a repassar ao Lindóia" },
    {
      key: "difference",
      label: funds.difference > 0 ? "A mais que a tabela" : "A menos que a tabela",
      amount: funds.difference,
      hint: "a conferir",
    },
  ];
  return parts.filter((part) => Math.abs(part.amount) >= 0.005);
}

/** Linha dentro do lançamento de mensalidade: quanto vai para cada fundo. */
export default function MensalidadeFundsLine({ funds }: { funds: MensalidadeFunds }) {
  const parts = fundParts(funds);
  const title = funds.preview
    ? "Mensalidade ainda não paga: divisão prevista pela composição de hoje. Ela é gravada no pagamento."
    : "Divisão gravada no dia do pagamento.";
  return (
    <div className="tx-funds" title={title}>
      <span className="tx-funds__label">{funds.preview ? "Divisão prevista" : "Divisão"}</span>
      {parts.map((part) => (
        <span
          key={part.key}
          className={`tx-funds__part tx-funds__part--${part.key}`}
          title={part.hint ? `${part.label}: ${part.hint}` : undefined}
        >
          {part.label} <strong>{brl(part.amount)}</strong>
        </span>
      ))}
      {funds.pendingSplit ? <span className="tx-funds__warn">divisão a confirmar</span> : null}
    </div>
  );
}
