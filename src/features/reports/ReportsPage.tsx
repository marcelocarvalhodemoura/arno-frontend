import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  type AssemblyReport,
  type BranchId,
  type CustomReportQuery,
  type CustomReportRow,
  type FiscalLedgerLine,
  type MovementType,
  type ReportGroupBy,
  type TxNature,
  type TxType,
} from "@/domain";
import PageHeader from "@/shared/ui/PageHeader";
import { PageGuide, reportsGuide } from "@/features/help";
import StatCard from "@/shared/ui/StatCard";
import RecordStamp from "@/shared/ui/RecordStamp";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import SubmitButton from "@/shared/ui/SubmitButton";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import { api } from "@/core/http";
import { useAuth } from "@/features/auth";
import { useLoadingBar } from "@/shared/feedback/loading";
import {
  auditAction,
  brl,
  downloadCsv,
  formatDate,
  formatDateTime,
  natureLabel,
  originLabel,
  toCsv,
  typeLabel,
} from "@/shared/lib/format";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { periodRange, usePeriod } from "@/shared/lib/period";
import { GROUP_BY_LABELS, REPORT_GROUPS, REPORTS, periodPresets, type ReportDef } from "./report-catalog";
import { ReportClosing, ReportLetterhead, SummaryBars } from "./ReportPrint";

type CustomResult = {
  rows: CustomReportRow[];
  totals: CustomReportRow;
  ledger: FiscalLedgerLine[];
  opening: number;
  closing: number;
};

type DelinquencyResult = {
  rows: {
    memberId: string;
    name: string;
    branchLabel: string;
    guardian: string | null;
    phone: string | null;
    months: string[];
    count: number;
    amount: number;
    oldest: string;
    daysLate: number;
  }[];
  byBranch: { label: string; members: number; amount: number }[];
  totals: { members: number; count: number; amount: number; due: number; rate: number };
};

type Result =
  | { kind: "custom"; data: CustomResult }
  | { kind: "assembly"; data: AssemblyReport }
  | { kind: "delinquency"; data: DelinquencyResult };

const ALL_LABEL = "Todos (sem filtro)";

/** Central de relatórios: catálogo, período, filtros e o mesmo papel timbrado na impressão. */
export default function Reports() {
  const { year, month } = usePeriod();
  const { name: issuerName, user: issuerUser } = useAuth();
  const { start, stop } = useLoadingBar();
  const [params, setParams] = useSearchParams();
  const initial = REPORTS.find((item) => item.id === params.get("modelo")) ?? REPORTS[0]!;
  const range = periodRange(year, month);

  const [report, setReport] = useState<ReportDef>(initial);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [branches, setBranches] = useState<BranchId[]>([]);
  const [types, setTypes] = useState<TxType[]>(initial.types ?? []);
  const [natures, setNatures] = useState<TxNature[]>([]);
  const [movementTypeIds, setMovementTypeIds] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(initial.groupBy ?? "movementType");
  const [showLedger, setShowLedger] = useState(Boolean(initial.ledgerByDefault));
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [issuedAt, setIssuedAt] = useState("");
  const [printing, setPrinting] = useState(false);
  const [summaryQuery, setSummaryQuery] = useState("");
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [runKey, setRunKey] = useState(1);

  useEffect(() => {
    void api<MovementType[]>("/movement-types").then(setMovementTypes);
  }, []);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    const timer = window.setTimeout(() => window.print(), 80);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  // Trocar de relatório ou de período pelos atalhos já gera de novo.
  useEffect(() => {
    if (runKey) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey]);

  function selectReport(next: ReportDef) {
    setReport(next);
    setTypes(next.types ?? []);
    setGroupBy(next.groupBy ?? "movementType");
    setShowLedger(Boolean(next.ledgerByDefault));
    setSummaryQuery("");
    setLedgerQuery("");
    setParams({ modelo: next.id }, { replace: true });
    setResult(null);
    setRunKey((key) => key + 1);
  }

  function choosePeriod(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    setRunKey((key) => key + 1);
  }

  function toggle<T extends string>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
    setDirty(true);
  }

  async function run() {
    if (!from || !to || from > to) {
      setError("Informe um período válido (De antes de Até).");
      return;
    }
    setBusy(true);
    setError(null);
    start();
    try {
      if (report.kind === "custom") {
        const query: CustomReportQuery = { from, to, branches, types, natures, movementTypeIds, groupBy };
        const data = await api<CustomResult>("/reports/custom", { method: "POST", body: JSON.stringify(query) });
        setResult({ kind: "custom", data });
      } else if (report.kind === "assembly") {
        setResult({ kind: "assembly", data: await api<AssemblyReport>(`/reports/assembly?from=${from}&to=${to}`) });
      } else {
        setResult({
          kind: "delinquency",
          data: await api<DelinquencyResult>(`/reports/delinquency?from=${from}&to=${to}`),
        });
      }
      setIssuedAt(new Date().toISOString());
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o relatório");
    } finally {
      setBusy(false);
      stop();
    }
  }

  const filterSummary = {
    branches: branches.length ? branches.map((id) => BRANCH_LABELS[id]).join(", ") : ALL_LABEL,
    types: types.length ? types.map(typeLabel).join(", ") : "Entradas e saídas",
    natures: natures.length ? natures.map(natureLabel).join(", ") : "Fixas e variáveis",
    movementTypes: movementTypeIds.length
      ? movementTypes
          .filter((t) => movementTypeIds.includes(t.id))
          .map((t) => t.name)
          .join(", ")
      : ALL_LABEL,
  };
  const activeFilters = [
    branches.length ? `${branches.length} ramo(s)` : "",
    !report.types && types.length === 1 ? typeLabel(types[0]!) : "",
    natures.length === 1 ? natureLabel(natures[0]!) : "",
    movementTypeIds.length ? `${movementTypeIds.length} tipo(s)` : "",
  ].filter(Boolean);

  const custom = result?.kind === "custom" ? result.data : null;
  const summaryRows = useMemo(
    () =>
      (custom?.rows ?? []).filter((row) =>
        matchesQuery(summaryQuery, [row.label, row.income, row.expense, row.net, row.count]),
      ),
    [custom, summaryQuery],
  );
  const ledgerRows = useMemo(
    () =>
      (custom?.ledger ?? []).filter((line) =>
        matchesQuery(ledgerQuery, [
          line.description,
          line.movementType,
          line.memberName,
          line.guardianName,
          line.accountHolder,
          BRANCH_LABELS[line.branch],
          typeLabel(line.type),
        ]),
      ),
    [custom, ledgerQuery],
  );
  const summaryListing = usePagedList(summaryRows, `${summaryQuery}|${issuedAt}|summary`);
  const ledgerListing = usePagedList(ledgerRows, `${ledgerQuery}|${issuedAt}|ledger`);
  // Na impressão sai o documento inteiro, sem paginação de tela.
  const summaryShown = printing ? summaryRows : summaryListing.pageRows;
  const ledgerShown = printing ? ledgerRows : ledgerListing.pageRows;
  const barMode = types.length === 1 ? (types[0] === "income" ? "income" : "expense") : "both";

  function exportCsv() {
    if (!result) return;
    const name = `${report.csvPrefix}-${from}-${to}.csv`;
    if (result.kind === "custom") {
      const rows = showLedger
        ? result.data.ledger.map((line) => ({
            Seq: line.seq,
            Data: formatDate(line.date),
            Direção: typeLabel(line.type),
            Natureza: natureLabel(line.nature),
            "Tipo de conta": line.movementType,
            Ramo: BRANCH_LABELS[line.branch],
            Associado: line.memberName ?? "",
            Responsável: line.guardianName ?? "",
            Conta: line.accountHolder ?? "",
            Descrição: line.description,
            "Lançado por": line.createdByName,
            "Registrado em": formatDateTime(line.createdAt),
            Situação: auditAction(line.updatedAt, line.createdAt),
            Origem: originLabel(line.origin, line.importSource),
            Entrada: line.income,
            Saída: line.expense,
            Saldo: line.balance,
          }))
        : result.data.rows.map((row) => ({
            [GROUP_BY_LABELS[groupBy]]: row.label,
            Entradas: row.income,
            Saídas: row.expense,
            Líquido: row.net,
            Lançamentos: row.count,
          }));
      downloadCsv(name, toCsv(rows));
    } else if (result.kind === "delinquency") {
      downloadCsv(
        name,
        toCsv(
          result.data.rows.map((row) => ({
            Associado: row.name,
            Ramo: row.branchLabel,
            Responsável: row.guardian ?? "",
            Telefone: row.phone ?? "",
            "Meses em aberto": row.months.join(", "),
            Quantidade: row.count,
            Valor: row.amount,
            "Vencida desde": formatDate(row.oldest),
            "Dias de atraso": row.daysLate,
          })),
        ),
      );
    } else {
      downloadCsv(
        name,
        toCsv([
          ...result.data.byBranch.map((row) => ({
            Bloco: "Ramo",
            Nome: row.label,
            Entradas: row.income,
            Saídas: row.expense,
          })),
          ...result.data.byType.map((row) => ({
            Bloco: "Tipo",
            Nome: row.name,
            Entradas: row.type === "income" ? row.amount : 0,
            Saídas: row.type === "expense" ? row.amount : 0,
          })),
        ]),
      );
    }
  }

  const issuer = `${issuerName ?? "Tesouraria"}${issuerUser ? ` (@${issuerUser})` : ""}`;

  return (
    <div className="fiscal-report">
      <div className="no-print">
        <PageHeader
          kicker="Relatórios"
          title={report.label}
          subtitle={report.summary}
          actions={
            <div className="page-head__actions">
              <PageGuide guide={reportsGuide} />
              <button className="btn btn-ghost" type="button" onClick={exportCsv} disabled={!result || busy}>
                Exportar CSV
              </button>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setPrinting(true)}
                disabled={!result || printing || busy}
              >
                {printing ? "Preparando…" : "Imprimir / PDF"}
              </button>
              <SubmitButton type="button" busy={busy} busyLabel="Gerando…" onClick={() => void run()}>
                Gerar relatório
              </SubmitButton>
            </div>
          }
        />
      </div>

      <div className="reports-layout">
        <nav className="card report-catalog no-print" aria-label="Relatórios disponíveis">
          {REPORT_GROUPS.map((group) => (
            <div key={group} className="report-catalog__group">
              <span className="report-catalog__title">{group}</span>
              {REPORTS.filter((item) => item.group === group).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`report-catalog__item${item.id === report.id ? " is-on" : ""}`}
                  aria-current={item.id === report.id ? "page" : undefined}
                  onClick={() => selectReport(item)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.summary}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="report-main">
          <article className="card report-config no-print">
            <div className="report-presets" role="group" aria-label="Atalhos de período">
              {periodPresets().map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`flag ${from === preset.from && to === preset.to ? "is-on" : ""}`}
                  onClick={() => choosePeriod(preset.from, preset.to)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="report-config__row">
              <label className="field">
                <span>De</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              <label className="field">
                <span>Até</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
              {report.kind === "custom" ? (
                <label className="field">
                  <span>Agrupar por</span>
                  <SearchableSelect
                    value={groupBy}
                    onChange={(value) => {
                      setGroupBy(value as ReportGroupBy);
                      setDirty(true);
                    }}
                    placeholder="Selecione"
                    options={(Object.keys(GROUP_BY_LABELS) as ReportGroupBy[]).map((key) => ({
                      value: key,
                      label: GROUP_BY_LABELS[key],
                    }))}
                  />
                </label>
              ) : null}
            </div>

            {report.kind === "custom" ? (
              <>
                <details className="report-filters">
                  <summary>
                    Filtros{" "}
                    <span className="muted">
                      · {activeFilters.length ? activeFilters.join(" · ") : "nenhum: todas as movimentações do período"}
                    </span>
                  </summary>
                  <div className="form-grid">
                    <div className="field wide">
                      <span>Ramos</span>
                      <div className="check-row">
                        {ALL_BRANCHES.map((id) => (
                          <label key={id}>
                            <input
                              type="checkbox"
                              checked={branches.includes(id)}
                              onChange={() => toggle(branches, id, setBranches)}
                            />
                            {BRANCH_LABELS[id]}
                          </label>
                        ))}
                      </div>
                    </div>
                    {!report.types ? (
                      <div className="field">
                        <span>Direção</span>
                        <div className="check-row">
                          <label>
                            <input
                              type="checkbox"
                              checked={types.includes("income")}
                              onChange={() => toggle(types, "income", setTypes)}
                            />
                            Entradas
                          </label>
                          <label>
                            <input
                              type="checkbox"
                              checked={types.includes("expense")}
                              onChange={() => toggle(types, "expense", setTypes)}
                            />
                            Saídas
                          </label>
                        </div>
                      </div>
                    ) : null}
                    <div className="field">
                      <span>Natureza</span>
                      <div className="check-row">
                        <label>
                          <input
                            type="checkbox"
                            checked={natures.includes("fixed")}
                            onChange={() => toggle(natures, "fixed", setNatures)}
                          />
                          Fixa
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            checked={natures.includes("variable")}
                            onChange={() => toggle(natures, "variable", setNatures)}
                          />
                          Variável
                        </label>
                      </div>
                    </div>
                    <div className="field wide">
                      <span>Tipos de conta</span>
                      <div className="check-row">
                        {movementTypes.map((t) => (
                          <label key={t.id}>
                            <input
                              type="checkbox"
                              checked={movementTypeIds.includes(t.id)}
                              onChange={() => toggle(movementTypeIds, t.id, setMovementTypeIds)}
                            />
                            {t.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
                <label className="report-ledger-toggle">
                  <input type="checkbox" checked={showLedger} onChange={(e) => setShowLedger(e.target.checked)} />
                  Incluir o livro-caixa detalhado (lançamento a lançamento, com saldo acumulado)
                </label>
              </>
            ) : null}

            {error ? <div className="error">{error}</div> : null}
            {dirty ? (
              <p className="report-dirty">Filtros ou período alterados: clique em Gerar relatório para atualizar.</p>
            ) : null}
            {groupBy === "branch" && report.kind === "custom" ? (
              <p className="muted">
                Agrupado por ramo, a mensalidade entra só com a caixinha (R$ 8) e o saldo é gerencial.
              </p>
            ) : null}
          </article>

          {busy && !result ? <PageLoader label="Gerando relatório…" /> : null}

          {result ? (
            <FetchOverlay active={busy} label="Gerando relatório…">
              <ReportLetterhead
                purpose={report.purpose}
                documentTitle={report.documentTitle}
                from={from}
                to={to}
                issuedAt={issuedAt}
                meta={
                  result.kind === "custom"
                    ? [
                        ["Documento", report.purpose],
                        ["Lançamentos", String(result.data.ledger.length)],
                        ["Ramos", filterSummary.branches],
                        ["Direção", filterSummary.types],
                        ["Agrupado por", GROUP_BY_LABELS[groupBy]],
                        ["Natureza", filterSummary.natures],
                        ["Tipos de conta", filterSummary.movementTypes],
                        ["Emitido por", `${issuer}${issuedAt ? ` · ${formatDateTime(issuedAt)}` : ""}`],
                      ]
                    : [
                        ["Documento", report.purpose],
                        ["Emitido por", `${issuer}${issuedAt ? ` · ${formatDateTime(issuedAt)}` : ""}`],
                      ]
                }
              />

              {result.kind === "custom" ? (
                <>
                  <table className="data report-balance print-only">
                    <caption>Quadro de saldos do período</caption>
                    <thead>
                      <tr>
                        <th className="num">Saldo inicial</th>
                        <th className="num">Entradas</th>
                        <th className="num">Saídas</th>
                        <th className="num">Resultado líquido</th>
                        <th className="num">Saldo final</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="is-total">
                        <td className="num">{brl(result.data.opening)}</td>
                        <td className="num is-pos">{brl(result.data.totals.income)}</td>
                        <td className="num is-neg">{brl(result.data.totals.expense)}</td>
                        <td className="num">{brl(result.data.totals.net)}</td>
                        <td className="num">{brl(result.data.closing)}</td>
                      </tr>
                    </tbody>
                  </table>
                  {barMode === "both" ? (
                    <div className="grid-stats no-print report-kpis">
                      <StatCard
                        title="Saldo inicial"
                        value={brl(result.data.opening)}
                        hint={`Em ${formatDate(from)}`}
                      />
                      <StatCard
                        title="Entradas"
                        value={brl(result.data.totals.income)}
                        tone="pos"
                        hint={`${result.data.ledger.filter((l) => l.income).length} lançamento(s)`}
                      />
                      <StatCard
                        title="Saídas"
                        value={brl(result.data.totals.expense)}
                        tone="neg"
                        hint={`${result.data.ledger.filter((l) => l.expense).length} lançamento(s)`}
                      />
                      <StatCard
                        title="Resultado"
                        value={brl(result.data.totals.net)}
                        tone={result.data.totals.net >= 0 ? "pos" : "neg"}
                        hint={`Saldo final ${brl(result.data.closing)}`}
                      />
                    </div>
                  ) : (
                    <SingleDirectionKpis data={result.data} mode={barMode} groupLabel={GROUP_BY_LABELS[groupBy]} />
                  )}

                  <article className="card report-section">
                    <div className="report-section__head">
                      <h3>Síntese por {GROUP_BY_LABELS[groupBy].toLowerCase()}</h3>
                      <span className="muted">{result.data.rows.length} grupo(s)</span>
                    </div>
                    {groupBy !== "none" ? <SummaryBars rows={result.data.rows} mode={barMode} /> : null}
                    <FilterBar>
                      <label className="field no-print">
                        <span>Buscar na síntese</span>
                        <input
                          value={summaryQuery}
                          onChange={(e) => setSummaryQuery(e.target.value)}
                          placeholder="Nome do grupo…"
                        />
                      </label>
                    </FilterBar>
                    <ListingResults fetching={busy} fetchLabel="Gerando relatório…">
                      <div className="table-wrap">
                        <table className="data report-summary">
                          <thead>
                            <tr>
                              <th scope="col">{GROUP_BY_LABELS[groupBy]}</th>
                              <th scope="col" className="num">
                                Entradas
                              </th>
                              <th scope="col" className="num">
                                Saídas
                              </th>
                              <th scope="col" className="num">
                                Líquido
                              </th>
                              <th scope="col" className="num">
                                % do total
                              </th>
                              <th scope="col" className="num">
                                Qtd.
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {summaryShown.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="muted">
                                  Nenhuma movimentação com esses filtros.
                                </td>
                              </tr>
                            ) : (
                              summaryShown.map((r) => {
                                const base =
                                  barMode === "expense" ? result.data.totals.expense : result.data.totals.income;
                                const value = barMode === "expense" ? r.expense : r.income;
                                return (
                                  <tr key={r.key}>
                                    <td>{r.label}</td>
                                    <td className="num is-pos">{brl(r.income)}</td>
                                    <td className="num is-neg">{brl(r.expense)}</td>
                                    <td className="num">{brl(r.net)}</td>
                                    <td className="num">
                                      {base ? `${((value / base) * 100).toFixed(1).replace(".", ",")}%` : "—"}
                                    </td>
                                    <td className="num">{r.count}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="is-total">
                              <td>
                                <strong>Total</strong>
                              </td>
                              <td className="num">
                                <strong>{brl(result.data.totals.income)}</strong>
                              </td>
                              <td className="num">
                                <strong>{brl(result.data.totals.expense)}</strong>
                              </td>
                              <td className="num">
                                <strong>{brl(result.data.totals.net)}</strong>
                              </td>
                              <td className="num">100%</td>
                              <td className="num">
                                <strong>{result.data.totals.count}</strong>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="no-print">
                        <Pager
                          total={summaryListing.total}
                          fromRow={summaryListing.fromRow}
                          toRow={summaryListing.toRow}
                          pageSize={summaryListing.pageSize}
                          currentPage={summaryListing.currentPage}
                          pageCount={summaryListing.pageCount}
                          onPageSize={summaryListing.setPageSize}
                          onPage={summaryListing.setPage}
                        />
                      </div>
                    </ListingResults>
                  </article>

                  {showLedger ? (
                    <article className="card report-section">
                      <div className="report-section__head">
                        <h3>Livro-caixa</h3>
                        <span className="muted">{result.data.ledger.length} lançamento(s)</span>
                      </div>
                      <FilterBar>
                        <label className="field no-print">
                          <span>Buscar lançamento</span>
                          <input
                            value={ledgerQuery}
                            onChange={(e) => setLedgerQuery(e.target.value)}
                            placeholder="Descrição, associado, tipo…"
                          />
                        </label>
                      </FilterBar>
                      <div className="table-wrap">
                        <table className="data ledger">
                          <caption className="print-only">
                            Livro-caixa · {formatDate(from)} a {formatDate(to)}
                          </caption>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Data</th>
                              <th>Histórico</th>
                              <th>Direção</th>
                              <th>Ramo</th>
                              <th className="num">Entrada</th>
                              <th className="num">Saída</th>
                              <th className="num">Saldo</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="is-opening">
                              <td>—</td>
                              <td>{formatDate(from)}</td>
                              <td colSpan={3}>
                                <strong>Saldo inicial do período</strong>
                              </td>
                              <td className="num">—</td>
                              <td className="num">—</td>
                              <td className="num">
                                <strong>{brl(result.data.opening)}</strong>
                              </td>
                            </tr>
                            {ledgerShown.map((line) => (
                              <tr key={line.id}>
                                <td>{line.seq}</td>
                                <td>{formatDate(line.date)}</td>
                                <td>
                                  <strong>{line.description}</strong>
                                  <div className="muted">
                                    {line.movementType}
                                    {line.memberName ? ` · ${line.memberName}` : ""}
                                    {line.guardianName ? ` · resp. ${line.guardianName}` : ""}
                                    {line.accountHolder ? ` · conta ${line.accountHolder}` : ""} ·{" "}
                                    {natureLabel(line.nature)}
                                  </div>
                                  <div className="no-print">
                                    <RecordStamp
                                      origin={line.origin}
                                      importSource={line.importSource}
                                      createdAt={line.createdAt}
                                      createdBy={line.createdByName ? { name: line.createdByName } : null}
                                      updatedAt={line.updatedAt}
                                      updatedBy={line.updatedByName ? { name: line.updatedByName } : null}
                                    />
                                  </div>
                                </td>
                                <td>{typeLabel(line.type)}</td>
                                <td>{BRANCH_LABELS[line.branch]}</td>
                                <td className="num is-pos">{line.income ? brl(line.income) : "—"}</td>
                                <td className="num is-neg">{line.expense ? brl(line.expense) : "—"}</td>
                                <td className="num">{brl(line.balance)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="is-total">
                              <td>—</td>
                              <td>{formatDate(to)}</td>
                              <td colSpan={3}>
                                <strong>Saldo final conferido</strong>
                              </td>
                              <td className="num">
                                <strong>{brl(result.data.totals.income)}</strong>
                              </td>
                              <td className="num">
                                <strong>{brl(result.data.totals.expense)}</strong>
                              </td>
                              <td className="num">
                                <strong>{brl(result.data.closing)}</strong>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="no-print">
                        <Pager
                          total={ledgerListing.total}
                          fromRow={ledgerListing.fromRow}
                          toRow={ledgerListing.toRow}
                          pageSize={ledgerListing.pageSize}
                          currentPage={ledgerListing.currentPage}
                          pageCount={ledgerListing.pageCount}
                          onPageSize={ledgerListing.setPageSize}
                          onPage={ledgerListing.setPage}
                        />
                      </div>
                    </article>
                  ) : null}
                </>
              ) : null}

              {result.kind === "assembly" ? <AssemblyView data={result.data} /> : null}
              {result.kind === "delinquency" ? <DelinquencyView data={result.data} /> : null}

              <ReportClosing purpose={report.purpose} issuedAt={issuedAt} signatures={report.showSignatures} />
            </FetchOverlay>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Relatórios de uma direção só (Entradas, Saídas): saldo não se aplica; mostra total, volume, maior grupo e média. */
function SingleDirectionKpis({
  data,
  mode,
  groupLabel,
}: {
  data: CustomResult;
  mode: "income" | "expense";
  groupLabel: string;
}) {
  const total = mode === "income" ? data.totals.income : data.totals.expense;
  const count = data.ledger.length;
  const top = [...data.rows].sort((a, b) => (mode === "income" ? b.income - a.income : b.expense - a.expense))[0];
  const topValue = top ? (mode === "income" ? top.income : top.expense) : 0;
  return (
    <div className="grid-stats no-print report-kpis">
      <StatCard
        title={mode === "income" ? "Total de entradas" : "Total de saídas"}
        value={brl(total)}
        tone={mode === "income" ? "pos" : "neg"}
      />
      <StatCard title="Lançamentos" value={String(count)} hint={`${data.rows.length} grupo(s)`} />
      <StatCard
        title={`Maior ${groupLabel.toLowerCase()}`}
        value={top ? brl(topValue) : "—"}
        hint={top ? `${top.label} · ${total ? Math.round((topValue / total) * 100) : 0}% do total` : "sem movimentação"}
      />
      <StatCard title="Média por lançamento" value={brl(count ? total / count : 0)} />
    </div>
  );
}

function AssemblyView({ data }: { data: AssemblyReport }) {
  return (
    <>
      <div className="grid-stats no-print report-kpis">
        <StatCard title="Saldo inicial" value={brl(data.openingBalance)} hint={`Em ${formatDate(data.from)}`} />
        <StatCard title="Entradas" value={brl(data.income)} tone="pos" />
        <StatCard title="Saídas" value={brl(data.expense)} tone="neg" />
        <StatCard
          title="Resultado"
          value={brl(data.result)}
          tone={data.result >= 0 ? "pos" : "neg"}
          hint={`Saldo final ${brl(data.closingBalance)}`}
        />
      </div>
      <table className="data report-balance print-only">
        <caption>Quadro de saldos do período</caption>
        <thead>
          <tr>
            <th className="num">Saldo inicial</th>
            <th className="num">Entradas</th>
            <th className="num">Saídas</th>
            <th className="num">Resultado</th>
            <th className="num">Saldo final</th>
          </tr>
        </thead>
        <tbody>
          <tr className="is-total">
            <td className="num">{brl(data.openingBalance)}</td>
            <td className="num is-pos">{brl(data.income)}</td>
            <td className="num is-neg">{brl(data.expense)}</td>
            <td className="num">{brl(data.result)}</td>
            <td className="num">{brl(data.closingBalance)}</td>
          </tr>
        </tbody>
      </table>
      <article className="card report-section">
        <div className="report-section__head">
          <h3>Entradas e saídas por ramo</h3>
        </div>
        <SummaryBars
          rows={data.byBranch.map((row) => ({
            key: row.branch,
            label: row.label,
            income: row.income,
            expense: row.expense,
          }))}
          mode="both"
        />
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Ramo</th>
                <th className="num">Entradas</th>
                <th className="num">Saídas</th>
                <th className="num">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {data.byBranch.map((row) => (
                <tr key={row.branch}>
                  <td>{row.label}</td>
                  <td className="num is-pos">{brl(row.income)}</td>
                  <td className="num is-neg">{brl(row.expense)}</td>
                  <td className="num">{brl(row.income - row.expense)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <div className="report-cols">
        <article className="card report-section">
          <h3>Principais tipos de conta</h3>
          <table className="data">
            <tbody>
              {data.byType.slice(0, 10).map((row) => (
                <tr key={`${row.type}-${row.name}`}>
                  <td>{row.name}</td>
                  <td className={`num ${row.type === "income" ? "is-pos" : "is-neg"}`}>
                    {row.type === "income" ? "+ " : "− "}
                    {brl(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="card report-section">
          <h3>Inadimplência de mensalidades</h3>
          <p className="report-rate">
            <strong>{data.delinquency.rate.toLocaleString("pt-BR")}%</strong> do valor vencido no período
          </p>
          <p className="muted">
            {data.delinquency.count} mensalidade(s) em aberto de {data.delinquency.members} associado(s), somando{" "}
            {brl(data.delinquency.amount)}.
          </p>
        </article>
      </div>
    </>
  );
}

function DelinquencyView({ data }: { data: DelinquencyResult }) {
  return (
    <>
      <div className="grid-stats no-print report-kpis">
        <StatCard
          title="Associados em atraso"
          value={String(data.totals.members)}
          hint={`${data.totals.count} mensalidade(s)`}
        />
        <StatCard title="Valor em aberto" value={brl(data.totals.amount)} tone="neg" />
        <StatCard title="Previsto no período" value={brl(data.totals.due)} hint="Mensalidades já vencidas" />
        <StatCard
          title="Inadimplência"
          value={`${data.totals.rate.toLocaleString("pt-BR")}%`}
          tone={data.totals.rate > 15 ? "neg" : undefined}
          hint="Valor em aberto ÷ previsto"
        />
      </div>
      <table className="data report-balance print-only">
        <caption>Resumo da inadimplência</caption>
        <thead>
          <tr>
            <th className="num">Associados em atraso</th>
            <th className="num">Mensalidades vencidas</th>
            <th className="num">Valor em aberto</th>
            <th className="num">Previsto no período</th>
            <th className="num">Inadimplência</th>
          </tr>
        </thead>
        <tbody>
          <tr className="is-total">
            <td className="num">{data.totals.members}</td>
            <td className="num">{data.totals.count}</td>
            <td className="num is-neg">{brl(data.totals.amount)}</td>
            <td className="num">{brl(data.totals.due)}</td>
            <td className="num">{data.totals.rate.toLocaleString("pt-BR")}%</td>
          </tr>
        </tbody>
      </table>
      {data.byBranch.length ? (
        <article className="card report-section">
          <h3>Em aberto por ramo</h3>
          <SummaryBars
            rows={data.byBranch.map((row) => ({
              key: row.label,
              label: `${row.label} (${row.members})`,
              income: 0,
              expense: row.amount,
            }))}
            mode="expense"
          />
        </article>
      ) : null}
      <article className="card report-section">
        <div className="report-section__head">
          <h3>Associados com mensalidade vencida</h3>
          <span className="muted">do maior valor para o menor</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Associado</th>
                <th>Ramo</th>
                <th>Responsável · telefone</th>
                <th>Meses em aberto</th>
                <th className="num">Valor</th>
                <th className="num">Atraso</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">
                    Nenhuma mensalidade vencida no período.
                  </td>
                </tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.memberId}>
                    <td>
                      <strong>{row.name}</strong>
                    </td>
                    <td>{row.branchLabel}</td>
                    <td>
                      {row.guardian ?? "—"}
                      {row.phone ? <div className="muted">{row.phone}</div> : null}
                    </td>
                    <td>{row.months.join(", ")}</td>
                    <td className="num is-neg">{brl(row.amount)}</td>
                    <td className="num">{row.daysLate} dias</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="is-total">
                <td colSpan={4}>
                  <strong>Total</strong>
                </td>
                <td className="num">
                  <strong>{brl(data.totals.amount)}</strong>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </article>
    </>
  );
}
