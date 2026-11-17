import { useMemo, useState } from "react";
import { BRANCH_LABELS, type BranchId } from "@/domain";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, formatDate } from "@/shared/lib/format";
import { usePeriod } from "@/shared/lib/period";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import FilterBar from "@/shared/ui/FilterBar";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import { ISSUE_LABELS, type ConferenceIssueKind, type ConferenceReport } from "./types";

const ISSUE_BADGES: Record<ConferenceIssueKind, string> = {
  unlinked: "overdue",
  difference: "over",
  drift: "watch",
  pending_split: "pending",
};

const ISSUE_HINTS: Record<ConferenceIssueKind, string> = {
  unlinked: "Mensalidade paga sem associado: vincule o associado no Fluxo de caixa para dividir o valor.",
  difference:
    "Pagamento diferente da tabela (vários meses juntos, valor parcial, desconto). Se cobre mais de um mês, faça o rateio por mês.",
  drift: "A composição ou o cadastro mudou depois do pagamento. A divisão gravada continua valendo.",
  pending_split: "Valor especial cuja divisão ainda não foi confirmada pela tesouraria.",
};

function branchLabel(branch: string) {
  return BRANCH_LABELS[branch as BranchId] ?? branch;
}

function yearOptions(current: number) {
  const first = 2026;
  const last = Math.max(first, new Date().getFullYear(), current);
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

export default function ConferencePage() {
  const { year, setYear } = usePeriod();
  const [kind, setKind] = useState<ConferenceIssueKind | "">("");
  const report = useFetch<ConferenceReport>(`/allocations/conference?year=${year}`);

  const issues = useMemo(
    () => (report.data?.issues ?? []).filter((issue) => !kind || issue.kind === kind),
    [report.data, kind],
  );

  if (!report.data) {
    if (report.error) return <p className="error">{report.error}</p>;
    return <PageLoader label="Carregando conferência…" />;
  }

  const { totals, byBranch, counts } = report.data;
  const kinds = (Object.keys(ISSUE_LABELS) as ConferenceIssueKind[]).filter((item) => counts[item] > 0);

  return (
    <FetchOverlay active={report.loading} label="Atualizando conferência…">
      <div>
        <PageHeader
          kicker="Mensalidades"
          title="Conferência das mensalidades"
          subtitle={`Para onde foi cada real das mensalidades pagas com vencimento em ${year}, pela divisão gravada no dia de cada pagamento.`}
        />

        <FilterBar>
          <label className="field">
            <span>Ano</span>
            <select value={year} onChange={(event) => setYear(Number(event.target.value))}>
              {yearOptions(year).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>

        <div className="grid-stats">
          <StatCard title="Recebido" value={brl(totals.received)} hint={`${totals.count} mensalidade(s) paga(s)`} />
          <StatCard
            title="Caixa do grupo"
            value={brl(totals.groupCash)}
            hint={`Operacional ${brl(totals.group)} + diluição ${brl(totals.dilution)} + atraso ${brl(totals.lateFee)} + dívida ${brl(totals.arrears)}`}
          />
          <StatCard
            title="Caixinhas dos ramos"
            value={brl(totals.branch)}
            hint="Soma das caixinhas de todos os ramos"
          />
          <StatCard title="Fundo do lanche" value={brl(totals.snack)} hint="Parte do lanche das mensalidades" />
          <StatCard title="Taxa do clube" value={brl(totals.club)} hint="A repassar ao Lindóia" />
          <StatCard
            title="Diferença"
            value={brl(totals.difference)}
            hint="Recebido − esperado pela tabela"
            tone={Math.abs(totals.difference) >= 0.01 ? "neg" : "pos"}
          />
        </div>

        <article className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Por ramo do associado</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Ramo</th>
                  <th className="num">Mensalidades</th>
                  <th className="num">Recebido</th>
                  <th className="num">Caixa do grupo</th>
                  <th className="num">Caixinha</th>
                  <th className="num">Lanche</th>
                  <th className="num">Clube</th>
                  <th className="num">Diferença</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={8} emptyMessage="Nenhuma mensalidade paga neste ano.">
                {byBranch.map((row, index) => (
                  <AnimatedRow key={row.memberBranch} index={index}>
                    <td>
                      <strong>{branchLabel(row.memberBranch)}</strong>
                    </td>
                    <td className="num">{row.count}</td>
                    <td className="num">{brl(row.received)}</td>
                    <td className="num">{brl(row.groupCash)}</td>
                    <td className="num">{brl(row.branch)}</td>
                    <td className="num">{brl(row.snack)}</td>
                    <td className="num">{brl(row.club)}</td>
                    <td className="num">{brl(row.difference)}</td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
        </article>

        <article className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Pontos de atenção</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <button
              type="button"
              className={`btn btn-sm ${kind === "" ? "btn-primary" : "btn-outline"}`}
              onClick={() => setKind("")}
            >
              Todos ({report.data.issues.length})
            </button>
            {kinds.map((item) => (
              <button
                key={item}
                type="button"
                className={`btn btn-sm ${kind === item ? "btn-primary" : "btn-outline"}`}
                onClick={() => setKind(item)}
              >
                {ISSUE_LABELS[item]} ({counts[item]})
              </button>
            ))}
          </div>
          {kind ? <p className="muted">{ISSUE_HINTS[kind]}</p> : null}
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Situação</th>
                  <th>Vencimento</th>
                  <th>Associado</th>
                  <th>Ramo</th>
                  <th className="num">Valor</th>
                  <th>O que aconteceu</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={6} emptyMessage="Nada para conferir: tudo bate com a tabela.">
                {issues.map((issue, index) => (
                  <AnimatedRow key={`${issue.kind}-${issue.transactionId}`} index={index}>
                    <td>
                      <Badge kind={ISSUE_BADGES[issue.kind]}>{ISSUE_LABELS[issue.kind]}</Badge>
                    </td>
                    <td>{formatDate(issue.date)}</td>
                    <td>
                      <strong>{issue.memberName ?? "—"}</strong>
                    </td>
                    <td>{branchLabel(issue.allocation?.memberBranch ?? issue.branch)}</td>
                    <td className="num">{brl(issue.amount)}</td>
                    <td>{issue.message}</td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
        </article>
      </div>
    </FetchOverlay>
  );
}
