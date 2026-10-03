import { useMemo, useState } from "react";
import NextSteps from "@/features/dashboard/NextSteps";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BRANCH_LABELS, type BranchId, type BudgetStatus, type DashboardPayload } from "@/domain";
import PageHeader from "@/shared/ui/PageHeader";
import { PageGuide, dashboardGuide } from "@/features/help";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import { budgetStatusLabel } from "@/shared/lib/budget";
import { brl, chartMoney, MONTHS } from "@/shared/lib/format";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { usePeriod } from "@/shared/lib/period";
import { useFetch } from "@/shared/hooks/use-fetch";

const BRANCH_COLORS: Record<BranchId, string> = {
  filhote: "#ee9b00",
  lobinho: "#e8b423",
  escoteiro: "#2d8a4e",
  senior: "#8b1a2b",
  pioneiro: "#c8102e",
  "flor-de-lis": "#0c2d6b",
  grupo: "#4BA3E3",
};

function StatusBadge({ status }: { status: BudgetStatus }) {
  return <Badge kind={status}>{budgetStatusLabel(status)}</Badge>;
}

function BudgetMeter({ planned, actual, status }: { planned: number; actual: number; status: BudgetStatus }) {
  const pct = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : actual > 0 ? 100 : 0;
  return (
    <div className="budget-meter">
      <div className="budget-meter__track">
        <span
          className={`budget-meter__fill${status === "over" ? " is-over" : status === "watch" ? " is-watch" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <small className="muted">{pct}% usado</small>
    </div>
  );
}

export default function Dashboard() {
  const { year, month } = usePeriod();
  const { data, loading, error } = useFetch<DashboardPayload>(`/dashboard?year=${year}&month=${month}`);
  const [query, setQuery] = useState("");
  const branchRows = useMemo(
    () =>
      (data?.byBranch ?? []).filter((row) =>
        matchesQuery(query, [BRANCH_LABELS[row.branch], row.members, row.income, row.expense]),
      ),
    [data, query],
  );
  const listing = usePagedList(branchRows, `${query}|${year}|${month}`);

  if (!data) {
    if (error) return <p className="error">{error}</p>;
    return <PageLoader label="Carregando painel…" />;
  }

  const periodLabel = month ? `${MONTHS[month - 1]} de ${year}` : `todo o ano de ${year}`;
  const balance = data.income - data.expense;
  const budget = data.budget;
  const budgetStatusOverall =
    budget.actualExpense > budget.plannedExpense
      ? ("over" as const)
      : budget.byBranch.some((row) => row.status === "watch") ||
          budget.byMovementType.some((row) => row.status === "watch")
        ? ("watch" as const)
        : ("ok" as const);
  const chart = data.chart.map((row) => {
    const label = MONTHS[Number(row.month.slice(5)) - 1] ?? row.month;
    return {
      name: month ? label : label.slice(0, 3),
      Entradas: row.income,
      Saídas: row.expense,
    };
  });
  const branchChart = data.byBranch.map((row) => ({
    name: BRANCH_LABELS[row.branch],
    Arrecadação: row.income,
    color: BRANCH_COLORS[row.branch],
    members: row.members,
  }));

  return (
    <FetchOverlay active={loading} label="Atualizando painel…">
      <div>
        <PageHeader
          kicker="Dashboard"
          title="Indicadores da tesouraria"
          subtitle={`Totais, associados e o caixa do grupo em ${periodLabel}.`}
          actions={
            <div className="page-head__actions">
              <PageGuide guide={dashboardGuide} />
              <Link className="btn btn-outline" to="/projetos">
                Abrir previsão
              </Link>
            </div>
          }
        />
        <NextSteps />
        {error ? <div className="error">{error}</div> : null}

        <div className="grid-stats" style={{ marginTop: 16 }}>
          <StatCard title="Saldo inicial" value={brl(data.opening)} hint="Antes do período filtrado" />
          <StatCard title="Entradas" value={brl(data.income)} tone="pos" hint={`Arrecadação de ${periodLabel}`} />
          <StatCard title="Saídas" value={brl(data.expense)} tone="neg" hint={`Pagamentos de ${periodLabel}`} />
          <StatCard title="Saldo atual" value={brl(data.current)} hint="Após entradas e saídas do período" />
        </div>

        <div className="grid-stats grid-stats--3" style={{ marginTop: 16 }}>
          <StatCard
            title="Resultado"
            value={brl(data.income - data.expense)}
            tone={data.income - data.expense >= 0 ? "pos" : "neg"}
            hint="Entradas menos saídas no período"
          />
          <StatCard
            title="Associados"
            value={String(data.members)}
            hint={`${data.activeMembers} ativos · cadastro até ${data.to.split("-").reverse().join("/")}`}
          />
          <StatCard
            title="Filhotes a Grupo"
            value={brl(data.byBranch.reduce((s, r) => s + r.income, 0))}
            hint="Por ramo: mensalidade só com a caixinha (R$ 8)"
          />
        </div>

        <article className="card" style={{ marginTop: 16 }}>
          <div className="page-head" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0 }}>Previsão × realizado · {year}</h3>
              <p className="muted" style={{ margin: "6px 0 0" }}>
                Orçamento anual do grupo
                {month ? " (independente do mês filtrado no painel)" : ""}. Situação:{" "}
                <StatusBadge status={budgetStatusOverall} />
              </p>
            </div>
            <Link className="btn btn-ghost" to="/projetos">
              Abrir previsão
            </Link>
          </div>

          <div className="grid-stats">
            <StatCard title="Planejado no ano" value={brl(budget.plannedExpense)} hint="Soma das previsões por ramo" />
            <StatCard
              title="Realizado no ano"
              value={brl(budget.actualExpense)}
              tone="neg"
              hint="Saídas liquidadas vinculadas à previsão"
            />
            <StatCard
              title="Saldo da previsão"
              value={brl(budget.remaining)}
              tone={budget.remaining >= 0 ? "pos" : "neg"}
              hint={`${budget.pctUsed}% do orçamento usado`}
            />
            <StatCard
              title="% usado"
              value={`${budget.pctUsed}%`}
              tone={budgetStatusOverall === "over" ? "neg" : budgetStatusOverall === "ok" ? "pos" : ""}
              hint={budgetStatusLabel(budgetStatusOverall)}
            />
          </div>

          {budget.byBranch.length === 0 && budget.byMovementType.length === 0 ? (
            <p className="muted" style={{ marginTop: 16 }}>
              Ainda não há previsão cadastrada para {year}. Cadastre em Previsão de gastos.
            </p>
          ) : (
            <div className="budget-tables">
              <div>
                <h4 style={{ marginTop: 0 }}>Por ramo</h4>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Ramo</th>
                        <th className="num">Planejado</th>
                        <th className="num">Realizado</th>
                        <th>Ritmo</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget.byBranch.map((row) => (
                        <tr key={row.branch}>
                          <td>
                            <span className="branch-dot" style={{ background: BRANCH_COLORS[row.branch] }} />{" "}
                            {BRANCH_LABELS[row.branch]}
                          </td>
                          <td className="num">{brl(row.planned)}</td>
                          <td className="num">{brl(row.actual)}</td>
                          <td>
                            <BudgetMeter planned={row.planned} actual={row.actual} status={row.status} />
                          </td>
                          <td>
                            <StatusBadge status={row.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div>
                <h4 style={{ marginTop: 0 }}>Por tipo de movimentação</h4>
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Tipo</th>
                        <th className="num">Planejado</th>
                        <th className="num">Realizado</th>
                        <th>Ritmo</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget.byMovementType.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="muted">
                            Vincule tipos aos itens da previsão para ver este consolidado.
                          </td>
                        </tr>
                      ) : (
                        budget.byMovementType.map((row) => (
                          <tr key={row.movementTypeId}>
                            <td>{row.name}</td>
                            <td className="num">{brl(row.planned)}</td>
                            <td className="num">{brl(row.actual)}</td>
                            <td>
                              <BudgetMeter planned={row.planned} actual={row.actual} status={row.status} />
                            </td>
                            <td>
                              <StatusBadge status={row.status} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </article>

        <div className="split-2" style={{ marginTop: 16 }}>
          <article className="card chart-card">
            <div className="chart-card__head">
              <div>
                <h3>Balanço</h3>
                <p className="muted">Entradas menos saídas em {periodLabel}</p>
              </div>
              <strong className={`chart-card__total ${balance >= 0 ? "is-pos" : "is-neg"}`}>{brl(balance)}</strong>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,45,107,.12)" />
                <XAxis dataKey="name" interval={0} tick={{ fontSize: month ? 13 : 11 }} />
                <YAxis />
                <Tooltip formatter={chartMoney} />
                <Legend />
                <Bar dataKey="Entradas" fill="#2d8a4e" radius={6} />
                <Bar dataKey="Saídas" fill="#c8102e" radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </article>
          <article className="card chart-card">
            <h3 style={{ marginBottom: 12 }}>Arrecadação por ramo</h3>
            <p className="muted" style={{ marginBottom: 12 }}>
              Filhotes a Pioneiro e Grupo em {periodLabel}. Mensalidade: só a caixinha do ramo (R$ 8).
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={branchChart} layout="vertical" margin={{ left: 16 }}>
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={90} />
                <Tooltip formatter={chartMoney} />
                <Bar dataKey="Arrecadação" radius={6}>
                  {branchChart.map((row) => (
                    <Cell key={row.name} fill={row.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </article>
        </div>

        <article className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Totais por ramo</h3>
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ramo…" />
            </label>
          </FilterBar>
          <ListingResults fetching={loading} fetchLabel="Atualizando painel…">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Ramo</th>
                    <th className="num">Associados*</th>
                    <th className="num">Arrecadado</th>
                    <th className="num">Saídas</th>
                    <th className="num">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">
                        Nenhum ramo com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    listing.pageRows.map((row) => (
                      <tr key={row.branch}>
                        <td>
                          <span className="branch-dot" style={{ background: BRANCH_COLORS[row.branch] }} />{" "}
                          {BRANCH_LABELS[row.branch]}
                        </td>
                        <td className="num">{row.members}</td>
                        <td className="num is-pos">{brl(row.income)}</td>
                        <td className="num is-neg">{brl(row.expense)}</td>
                        <td className={`num ${row.income - row.expense >= 0 ? "is-pos" : "is-neg"}`}>
                          {brl(row.income - row.expense)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pager
              total={listing.total}
              fromRow={listing.fromRow}
              toRow={listing.toRow}
              pageSize={listing.pageSize}
              currentPage={listing.currentPage}
              pageCount={listing.pageCount}
              onPageSize={listing.setPageSize}
              onPage={listing.setPage}
            />
          </ListingResults>
          <p className="muted" style={{ marginTop: 12 }}>
            * Associados com data de cadastro até {data.to.split("-").reverse().join("/")}, conforme o filtro de mês e
            ano. Totais por ramo: mensalidade conta só a caixinha (R$ 8); demais lançamentos entram pelo valor integral.
          </p>
        </article>
      </div>
    </FetchOverlay>
  );
}
