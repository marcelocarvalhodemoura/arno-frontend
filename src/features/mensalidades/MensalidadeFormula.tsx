import { amountsNear, type MensalidadeCell, type MensalidadeFormula } from "@/domain";
import { brl } from "@/shared/lib/format";

type Timing = "onTime" | "late";

const PARTS: {
  key: keyof Pick<MensalidadeFormula, "group" | "branch" | "snack" | "club" | "dilution" | "lateFee">;
  label: string;
  short: string;
}[] = [
  { key: "group", label: "Operacional (caixa do grupo)", short: "operacional" },
  { key: "branch", label: "Caixinha do ramo", short: "caixinha" },
  { key: "snack", label: "Lanche", short: "lanche" },
  { key: "club", label: "Taxa do clube", short: "clube" },
  { key: "dilution", label: "Diluição dez/jan/fev", short: "diluição" },
  { key: "lateFee", label: "Acréscimo por atraso", short: "atraso" },
];

const SOURCE_NOTES: Record<MensalidadeFormula["source"], string> = {
  table: "",
  family: "Valor especial (irmãos / filho de chefe): fixo, não muda com atraso nem com a taxa do clube.",
  custom: "Valor personalizado do cadastro: a caixinha do ramo sai primeiro, o resto vai para o grupo.",
};

/** Número sem "R$" e sem centavos quando inteiro (fórmula curta). */
function num(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Valor da mensalidade (sem dívida) já lançado no mês, quando há lançamento. */
function launchedAmount(cell: MensalidadeCell): number | null {
  if (!cell.transactionId) return null;
  return cell.amount;
}

/** Qual das duas fórmulas vale para o mês: a que bate com o lançamento ou, senão, a do status. */
export function appliedTiming(cell: MensalidadeCell): Timing {
  const formula = cell.formula;
  const launched = launchedAmount(cell);
  if (formula && launched != null) {
    if (amountsNear(launched, formula.onTime.total)) return "onTime";
    if (amountsNear(launched, formula.late.total)) return "late";
  }
  return cell.status === "overdue" ? "late" : "onTime";
}

function arrearsOf(cell: MensalidadeCell): number {
  return (cell.status === "paid" ? cell.paidArrearsInstallment : cell.arrearsInstallment) ?? 0;
}

/** Fórmula em uma linha, para a dica da célula: "operacional 43 + caixinha 8 + … = 89,50". */
export function formulaText(cell: MensalidadeCell): string {
  if (!cell.formula) return "";
  const formula = cell.formula[appliedTiming(cell)];
  const parts = PARTS.filter(({ key }) => formula[key] > 0).map(({ key, short }) => `${short} ${num(formula[key])}`);
  const lines = [`Composição: ${parts.join(" + ")} = ${num(formula.total)}`];
  const arrears = arrearsOf(cell);
  if (arrears > 0) lines.push(`+ parcela da dívida ${num(arrears)} = ${num(formula.total + arrears)}`);
  if (formula.pendingSplit) lines.push("Divisão a confirmar pela tesouraria");
  return lines.join("\n");
}

/** Quadro com a fórmula do mês (no prazo × com atraso), a dívida e a conferência com o lançamento. */
export default function MensalidadeFormulaTable({ cell }: { cell: MensalidadeCell }) {
  const formula = cell.formula;
  if (!formula) return null;
  const { onTime, late } = formula;
  const sameTotals = amountsNear(onTime.total, late.total);
  const columns: { timing: Timing; label: string; value: MensalidadeFormula }[] = sameTotals
    ? [{ timing: "onTime", label: "Valor", value: onTime }]
    : [
        { timing: "onTime", label: "No prazo", value: onTime },
        { timing: "late", label: "Com atraso", value: late },
      ];
  const applied = appliedTiming(cell);
  const rows = PARTS.filter(({ key }) => onTime[key] > 0 || late[key] > 0);
  const arrears = arrearsOf(cell);
  const launched = launchedAmount(cell);
  const matches = launched == null || amountsNear(launched, onTime.total) || amountsNear(launched, late.total);
  const reference = formula[applied].total;
  const pendingSplit = onTime.pendingSplit || late.pendingSplit;
  const sourceNote = SOURCE_NOTES[onTime.source];

  return (
    <div className="fee-formula">
      <table className="fee-formula__table">
        <thead>
          <tr>
            <th>Parcela{pendingSplit ? " *" : ""}</th>
            {columns.map((column) => (
              <th
                key={column.timing}
                className={`num${!sameTotals && column.timing === applied && matches ? " is-applied" : ""}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label }) => (
            <tr key={key}>
              <td>{label}</td>
              {columns.map((column) => (
                <td key={column.timing} className="num">
                  {column.value[key] > 0 ? brl(column.value[key]) : "—"}
                </td>
              ))}
            </tr>
          ))}
          {!cell.clubFeeIncluded && onTime.source === "table" ? (
            <tr className="is-off">
              <td>Taxa do clube</td>
              <td className="num" colSpan={columns.length}>
                removida neste mês
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr className="is-subtotal">
            <td>Mensalidade</td>
            {columns.map((column) => (
              <td key={column.timing} className="num">
                {brl(column.value.total)}
              </td>
            ))}
          </tr>
          {arrears > 0 ? (
            <>
              <tr>
                <td>Parcela da dívida{cell.status === "paid" ? " (paga)" : ""}</td>
                {columns.map((column) => (
                  <td key={column.timing} className="num">
                    {brl(arrears)}
                  </td>
                ))}
              </tr>
              <tr className="is-total">
                <td>Total do mês</td>
                {columns.map((column) => (
                  <td key={column.timing} className="num">
                    {brl(column.value.total + arrears)}
                  </td>
                ))}
              </tr>
            </>
          ) : null}
        </tfoot>
      </table>
      {pendingSplit ? (
        <p className="muted fee-formula__note">* Divisão a confirmar pela tesouraria: o total vale, as parcelas não.</p>
      ) : null}
      {sourceNote ? <p className="muted fee-formula__note">{sourceNote}</p> : null}
      {!matches && launched != null ? (
        <p className="fee-formula__note fee-formula__warn">
          {cell.status === "paid" ? "Valor pago" : "Valor lançado"}: {brl(launched)}, diferença de{" "}
          {brl(launched - reference)} em relação à fórmula ({applied === "late" ? "com atraso" : "no prazo"}).
        </p>
      ) : null}
    </div>
  );
}
