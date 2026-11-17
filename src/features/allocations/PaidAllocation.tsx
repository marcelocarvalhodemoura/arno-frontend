import { brl, formatDateTime } from "@/shared/lib/format";
import { useFetch } from "@/shared/hooks/use-fetch";
import { ALLOCATION_PARTS, type AllocationDetail } from "./types";

/** Divisão gravada quando a mensalidade foi paga: para onde foi cada real e se bate com o recebido. */
export default function PaidAllocation({ transactionId }: { transactionId: string }) {
  const detail = useFetch<AllocationDetail>(`/allocations/${transactionId}`);
  if (detail.error) return <p className="muted fee-formula__note">Divisão do pagamento: {detail.error}</p>;
  if (!detail.data) return <p className="muted fee-formula__note">Carregando divisão do pagamento…</p>;

  const { allocation, groupCash, current, currentDescription } = detail.data;
  const rows = ALLOCATION_PARTS.filter(({ key }) => allocation[key] > 0);
  const hasDifference = Math.abs(allocation.difference) >= 0.01;
  const drifted =
    current != null && ALLOCATION_PARTS.some(({ key }) => Math.abs(current[key] - allocation[key]) >= 0.01);

  return (
    <div className="fee-formula">
      <table className="fee-formula__table">
        <thead>
          <tr>
            <th>Divisão gravada no pagamento{allocation.pendingSplit ? " *" : ""}</th>
            <th>Destino</th>
            <th className="num">Valor</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, destination }) => (
            <tr key={key}>
              <td>{key === "club" ? `${label} (${allocation.late ? "após o vencimento" : "no prazo"})` : label}</td>
              <td>{destination}</td>
              <td className="num">{brl(allocation[key])}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="is-subtotal">
            <td colSpan={2}>Esperado pela composição de {allocation.periodStart}</td>
            <td className="num">{brl(allocation.expected)}</td>
          </tr>
          <tr className="is-total">
            <td colSpan={2}>Recebido</td>
            <td className="num">{brl(allocation.received)}</td>
          </tr>
        </tfoot>
      </table>
      <p className="muted fee-formula__note">
        Caixa do grupo fica com {brl(groupCash)} (operacional + diluição + atraso + dívida). Divisão gravada em{" "}
        {formatDateTime(allocation.computedAt)}; mudar a composição ou o cadastro depois não altera estes valores.
      </p>
      {allocation.pendingSplit ? (
        <p className="muted fee-formula__note">* Divisão a confirmar pela tesouraria: o total vale, as parcelas não.</p>
      ) : null}
      {hasDifference ? (
        <p className="fee-formula__note fee-formula__warn">
          Recebido {brl(Math.abs(allocation.difference))} {allocation.difference < 0 ? "a menos" : "a mais"} que o
          esperado. As partes acima seguem a tabela; a diferença aparece na Conferência.
        </p>
      ) : null}
      {drifted && currentDescription ? (
        <p className="fee-formula__note fee-formula__warn">
          Com a composição e o cadastro de hoje seria: {currentDescription}
        </p>
      ) : null}
    </div>
  );
}
