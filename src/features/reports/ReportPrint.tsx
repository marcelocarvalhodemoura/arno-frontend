import type { ReactNode } from "react";
import { YOUTH_BRANCHES } from "@/domain";
import logo from "@/shared/assets/arno_logo.png";
import { formatDate, formatDateTime } from "@/shared/lib/format";

type HeadProps = {
  purpose: string;
  documentTitle: string;
  from: string;
  to: string;
  issuedAt: string;
  /** Pares rótulo/valor da “Identificação do documento”, em duas colunas. */
  meta: [string, ReactNode][];
};

/** Papel timbrado de todos os relatórios: brasão, identificação do grupo e período. Só aparece na impressão. */
export function ReportLetterhead({ purpose, documentTitle, from, to, issuedAt, meta }: HeadProps) {
  const pairs: [string, ReactNode][][] = [];
  for (let i = 0; i < meta.length; i += 2) pairs.push(meta.slice(i, i + 2));
  return (
    <div className="print-only report-cover">
      <table className="report-letterhead">
        <tbody>
          <tr>
            <td className="report-letterhead__brand">
              <img src={logo} alt="Brasão do Grupo Escoteiro Arno Friedrich" />
            </td>
            <td className="report-letterhead__id">
              <span className="report-letterhead__ueb">União dos Escoteiros do Brasil</span>
              <strong>Grupo Escoteiro Arno Friedrich</strong>
              <span>Registro 43/RS · Sede no Lindóia Tênis Clube · Porto Alegre</span>
              <span>Travessa Comandante Gustavo Cramer, 90 · Lindóia</span>
              <em>{purpose}</em>
            </td>
            <td className="report-letterhead__period">
              <span>Documento</span>
              <strong>{documentTitle}</strong>
              <span>Período apurado</span>
              <strong>
                {formatDate(from)} a {formatDate(to)}
              </strong>
              <span>{issuedAt ? `Emitido em ${formatDateTime(issuedAt)}` : ""}</span>
            </td>
          </tr>
          <tr>
            <td colSpan={3} className="report-letterhead__rule">
              <table>
                <tbody>
                  <tr>
                    <td className="is-forest" />
                    <td className="is-gold" />
                    <td className="is-clay" />
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      <table className="data report-meta">
        <caption>Identificação do documento</caption>
        <tbody>
          {pairs.map((pair, index) => (
            <tr key={index}>
              {pair.map(([label, value]) => (
                <FragmentCells key={label} label={label} value={value} />
              ))}
              {pair.length === 1 ? (
                <>
                  <th />
                  <td />
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FragmentCells({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <th>{label}</th>
      <td>{value}</td>
    </>
  );
}

type CloseProps = { purpose: string; issuedAt: string; signatures?: boolean };

/** Fecho de todos os relatórios: assinaturas (quando o documento pede) e rodapé com o brasão. */
export function ReportClosing({ purpose, issuedAt, signatures = false }: CloseProps) {
  return (
    <div className="print-only report-closing">
      {signatures ? (
        <table className="data report-signatures">
          <caption>Conferência e assinaturas</caption>
          <thead>
            <tr>
              <th>Tesouraria</th>
              <th>Comissão fiscal</th>
              <th>Diretoria</th>
            </tr>
          </thead>
          <tbody>
            <tr className="report-signatures__space">
              <td />
              <td />
              <td />
            </tr>
            <tr className="report-signatures__label">
              <td>Nome legível e assinatura</td>
              <td>Nome legível e assinatura</td>
              <td>Nome legível e assinatura</td>
            </tr>
            <tr className="report-signatures__label">
              <td>Data ____/____/________</td>
              <td>Data ____/____/________</td>
              <td>Data ____/____/________</td>
            </tr>
          </tbody>
        </table>
      ) : null}
      <table className="report-footer">
        <tbody>
          <tr>
            <td className="report-footer__mark">
              <img src={logo} alt="" />
            </td>
            <td>
              Grupo Escoteiro Arno Friedrich · Registro 43/RS · UEB · LTC · Ramos:{" "}
              {YOUTH_BRANCHES.map((b) => b.unit).join(", ")} e Grupo. Documento emitido pelo sistema de tesouraria ·{" "}
              {purpose.toLowerCase()}
              {issuedAt ? ` em ${formatDateTime(issuedAt)}` : ""}.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Barras horizontais (tela e impressão) para a síntese de qualquer relatório. */
export function SummaryBars({
  rows,
  mode,
}: {
  rows: { key: string; label: string; income: number; expense: number }[];
  mode: "income" | "expense" | "both";
}) {
  const top = [...rows].sort((a, b) => Math.max(b.income, b.expense) - Math.max(a.income, a.expense)).slice(0, 12);
  const max = Math.max(1, ...top.map((row) => Math.max(row.income, row.expense)));
  if (!top.length) return null;
  const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div className="report-bars" role="img" aria-label="Maiores valores da síntese">
      {top.map((row) => (
        <div key={row.key} className="report-bar">
          <span className="report-bar__label" title={row.label}>
            {row.label}
          </span>
          <span className="report-bar__tracks">
            {mode !== "expense" ? <i className="is-income" style={{ width: `${(row.income / max) * 100}%` }} /> : null}
            {mode !== "income" ? <i className="is-expense" style={{ width: `${(row.expense / max) * 100}%` }} /> : null}
          </span>
          <span className="report-bar__value">
            {mode !== "expense" ? <span className="is-pos">{brl(row.income)}</span> : null}
            {mode === "both" ? <br /> : null}
            {mode !== "income" ? <span className="is-neg">{brl(row.expense)}</span> : null}
          </span>
        </div>
      ))}
    </div>
  );
}
