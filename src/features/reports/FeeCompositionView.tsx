import type { PaidFeeComposition } from "@/domain";
import { brl } from "@/shared/lib/format";
import { compositionRows } from "./fee-composition";

function percent(amount: number, total: number) {
  return total ? `${((amount / total) * 100).toFixed(1).replace(".", ",")}%` : "—";
}

/** Quadro "Composição das mensalidades recebidas": quanto de cada mensalidade paga foi para cada destino. */
export default function FeeCompositionView({ data }: { data: PaidFeeComposition }) {
  const rows = compositionRows(data);
  const count = data.totals.count + data.unlinked.count;
  return (
    <article className="card report-section fee-composition">
      <div className="report-section__head">
        <h3>Composição das mensalidades recebidas</h3>
        <span className="muted">{count} mensalidade(s) paga(s)</span>
      </div>
      <p className="muted">
        Cada mensalidade entra no caixa pelo valor cheio. Aqui ela aparece dividida como foi gravada no dia do
        pagamento: operacional e diluição ficam no caixa do grupo, a caixinha vai para o ramo do jovem, o lanche para o
        fundo do lanche e a taxa do clube fica reservada até o repasse.
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Destino</th>
              <th className="num">Valor</th>
              <th className="num">% do recebido</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((row) => row.kind !== "total")
              .map((row, index) =>
                row.kind === "destination" ? (
                  <tr key={`${row.label}-${index}`} className="fee-composition__destination">
                    <td>
                      <strong>{row.label}</strong>
                      {row.note ? <span className="muted"> · {row.note}</span> : null}
                    </td>
                    <td className="num">
                      <strong>{brl(row.amount)}</strong>
                    </td>
                    <td className="num">{percent(row.amount, data.total)}</td>
                  </tr>
                ) : (
                  <tr key={`${row.label}-${index}`} className="fee-composition__part">
                    <td>{row.label}</td>
                    <td className="num">{brl(row.amount)}</td>
                    <td className="num muted">{percent(row.amount, data.total)}</td>
                  </tr>
                ),
              )}
          </tbody>
          <tfoot>
            <tr className="is-total">
              <td>
                <strong>Mensalidades recebidas</strong>
              </td>
              <td className="num">
                <strong>{brl(data.total)}</strong>
              </td>
              <td className="num">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
  );
}
