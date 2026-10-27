import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  type AssemblyReport,
  type BranchId,
  type CustomReportQuery,
  type CustomReportRow,
  type EventResultRow,
  type FiscalLedgerLine,
  type MovementType,
  type ReportGroupBy,
  type TxType,
  type TypePayers,
} from "@/domain";
import PageHeader from "@/shared/ui/PageHeader";
import { PageGuide, reportsGuide } from "@/features/help";
import StatCard from "@/shared/ui/StatCard";
import RecordStamp from "@/shared/ui/RecordStamp";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
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
import {
  GROUP_BY_LABELS,
  REPORT_GROUPS,
  REPORTS,
  periodPresets,
  reportFromParam,
  type ReportDef,
} from "./report-catalog";
import { ReportClosing, ReportLetterhead, SummaryBars } from "./ReportPrint";
import { joinCsvBlocks, reportSectionsCsv } from "./report-csv";
import ReportBuilder, { builderTitle, type BuilderState } from "./ReportBuilder";

type CustomResult = {
  rows: CustomReportRow[];
  totals: CustomReportRow;
  ledger: FiscalLedgerLine[];
  opening: number;
  closing: number;
  events: EventResultRow[];
  payers: TypePayers[];
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

const DIRECTIONS: { label: string; types: TxType[] }[] = [
  { label: "Entradas e saídas", types: [] },
  { label: "Só entradas", types: ["income"] },
  { label: "Só saídas", types: ["expense"] },
];

function sameTypes(a: TxType[], b: TxType[]) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

/** Central de relatórios: catálogo, período, filtros e o mesmo papel timbrado na impressão. */
export default function Reports() {
  const { year, month } = usePeriod();
  const { name: issuerName, user: issuerUser } = useAuth();
  const { start, stop } = useLoadingBar();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initial = reportFromParam(params.get("modelo"));
  const range = periodRange(year, month);

  const [report, setReport] = useState<ReportDef>(initial.report);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [branches, setBranches] = useState<BranchId[]>([]);
  const [types, setTypes] = useState<TxType[]>(initial.types ?? initial.report.types ?? []);
  const [movementTypeIds, setMovementTypeIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(initial.groupBy ?? initial.report.groupBy ?? "movementType");
  const [showLedger, setShowLedger] = useState(Boolean(initial.report.ledgerByDefault));
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issuedAt, setIssuedAt] = useState("");
  const [printing, setPrinting] = useState(false);
  const [summaryQuery, setSummaryQuery] = useState("");
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [movementTypesLoaded, setMovementTypesLoaded] = useState(false);

  useEffect(() => {
    void api<MovementType[]>("/movement-types")
      .then(setMovementTypes)
      .finally(() => setMovementTypesLoaded(true));
  }, []);

  /** Tipos já filtrados pelo modelo (ex.: "A identificar") somados aos escolhidos na tela. */
  const presetTypeIds = useMemo(() => {
    const names = (report.presetTypeNames ?? []).map((name) => name.toLowerCase());
    return movementTypes.filter((t) => names.includes(t.name.toLowerCase())).map((t) => t.id);
  }, [report, movementTypes]);
  const waitsForTypes = Boolean(report.presetTypeNames?.length) && !movementTypesLoaded;

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

  // Qualquer mudança de modelo, período ou filtro atualiza o relatório sozinha (com uma pausa para digitar datas).
  const queryKey = JSON.stringify([
    report.id,
    from,
    to,
    branches,
    types,
    movementTypeIds,
    memberIds,
    presetTypeIds,
    groupBy,
  ]);
  useEffect(() => {
    if (waitsForTypes) return;
    const timer = window.setTimeout(() => void run(), 350);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, waitsForTypes]);

  function selectReport(next: ReportDef) {
    if (next.to) {
      navigate(next.to);
      return;
    }
    setReport(next);
    setTypes(next.types ?? []);
    setGroupBy(next.groupBy ?? "movementType");
    setMovementTypeIds([]);
    setMemberIds([]);
    setTemplateName(null);
    setShowLedger(Boolean(next.ledgerByDefault));
    setSummaryQuery("");
    setLedgerQuery("");
    setParams({ modelo: next.id }, { replace: true });
    setResult(null);
  }

  function applyBuilder(patch: Partial<BuilderState>) {
    if (patch.from !== undefined) setFrom(patch.from);
    if (patch.to !== undefined) setTo(patch.to);
    if (patch.types) setTypes(patch.types);
    if (patch.groupBy) setGroupBy(patch.groupBy);
    if (patch.branches) setBranches(patch.branches);
    if (patch.movementTypeIds) setMovementTypeIds(patch.movementTypeIds);
    if (patch.memberIds) setMemberIds(patch.memberIds);
    if (patch.showLedger !== undefined) setShowLedger(patch.showLedger);
  }

  function choosePeriod(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
  }

  function toggle<T extends string>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
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
        const query: CustomReportQuery = {
          from,
          to,
          branches,
          types,
          natures: [],
          movementTypeIds: [...new Set([...presetTypeIds, ...movementTypeIds])],
          memberIds,
          groupBy,
        };
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
            "Tipo de movimentação": line.movementType,
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
      downloadCsv(name, joinCsvBlocks([toCsv(rows), ...reportSectionsCsv(result.data.events, result.data.payers)]));
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
          ...result.data.destinations.rows.map((row) => ({
            Bloco: "Destino",
            Nome: row.label,
            "Saldo anterior": row.opening,
            Entradas: row.income,
            Saídas: row.expense,
            Saldo: row.balance,
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
  // No montador, o título do documento sai das escolhas (ou do nome do modelo aberto).
  const documentTitle = report.builder
    ? (templateName ?? builderTitle({ from, to, types, groupBy, branches, movementTypeIds, memberIds, showLedger }))
    : report.documentTitle;

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
                  <strong>
                    {item.label}
                    {item.to ? <span aria-hidden="true"> ↗</span> : null}
                  </strong>
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
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="field">
                <span>Até</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>

            {report.builder ? (
              <ReportBuilder
                from={from}
                to={to}
                types={types}
                groupBy={groupBy}
                branches={branches}
                movementTypeIds={movementTypeIds}
                memberIds={memberIds}
                showLedger={showLedger}
                movementTypes={movementTypes}
                onChange={applyBuilder}
                onTemplate={setTemplateName}
              />
            ) : null}

            {report.views || report.chooseDirection ? (
              <div className="report-views">
                {report.views ? (
                  <div className="report-presets" role="group" aria-label="Ver por">
                    <span className="muted">Ver por</span>
                    {report.views.map((view) => (
                      <button
                        key={view}
                        type="button"
                        className={`flag ${groupBy === view ? "is-on" : ""}`}
                        onClick={() => setGroupBy(view)}
                      >
                        {GROUP_BY_LABELS[view]}
                      </button>
                    ))}
                  </div>
                ) : null}
                {report.chooseDirection ? (
                  <div className="report-presets" role="group" aria-label="Mostrar">
                    <span className="muted">Mostrar</span>
                    {DIRECTIONS.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        className={`flag ${sameTypes(types, option.types) ? "is-on" : ""}`}
                        onClick={() => setTypes(option.types)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {report.kind === "custom" && !report.builder ? (
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
                    <div className="field wide">
                      <span>Tipos de movimentação</span>
                      <div className="check-row">
                        {movementTypes.map((t) => (
                          <label key={t.id}>
                            <input
                              type="checkbox"
                              checked={movementTypeIds.includes(t.id)}
                              onChange={() => toggle(movementTypeIds, t.id, setMovementTypeIds)}
                            />
                            {t.name}
                            {t.audience === "internal" ? <span className="muted"> · interno</span> : null}
                            {t.audience === "external" ? <span className="muted"> · externo</span> : null}
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
          </article>

          {busy && !result ? <PageLoader label="Gerando relatório…" /> : null}

          {result ? (
            <FetchOverlay active={busy} label="Gerando relatório…">
              <ReportLetterhead
                purpose={report.purpose}
                documentTitle={documentTitle}
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
                        ["Tipos de movimentação", filterSummary.movementTypes],
                        ...(memberIds.length
                          ? [["Associados", `${memberIds.length} selecionado(s)`] as [string, string]]
                          : []),
                        ["Emitido por", `${issuer}${issuedAt ? ` · ${formatDateTime(issuedAt)}` : ""}`],
                      ]
                    : [
                        ["Documento", report.purpose],
                        ["Emitido por", `${issuer}${issuedAt ? ` · ${formatDateTime(issuedAt)}` : ""}`],
                      ]
                }
              />

              <ResultSentence result={result} from={from} to={to} />

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
                      <h3>Por {GROUP_BY_LABELS[groupBy].toLowerCase()}</h3>
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

                  {result.data.events.length ? <EventResultsView rows={result.data.events} /> : null}
                  {result.data.payers.map((group) => (
                    <TypePayersView key={group.movementTypeId} data={group} />
                  ))}

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
                                    {line.accountHolder ? ` · conta ${line.accountHolder}` : ""}
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

/** Público externo: cada evento com o que entrou, o que saiu e o resultado. */
function EventResultsView({ rows }: { rows: EventResultRow[] }) {
  const total = rows.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      expense: acc.expense + row.expense,
      net: acc.net + row.net,
      count: acc.count + row.count,
    }),
    { income: 0, expense: 0, net: 0, count: 0 },
  );
  return (
    <article className="card report-section">
      <div className="report-section__head">
        <h3>Resultado dos eventos (público externo)</h3>
        <span className="muted">{rows.length} evento(s)</span>
      </div>
      <div className="table-wrap">
        <table className="data report-summary">
          <thead>
            <tr>
              <th scope="col">Evento</th>
              <th scope="col" className="num">
                Arrecadado
              </th>
              <th scope="col" className="num">
                Gasto
              </th>
              <th scope="col" className="num">
                Resultado
              </th>
              <th scope="col" className="num">
                Qtd.
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.movementTypeId}>
                <td>{row.name}</td>
                <td className="num is-pos">{brl(row.income)}</td>
                <td className="num is-neg">{brl(row.expense)}</td>
                <td className={`num ${row.net >= 0 ? "is-pos" : "is-neg"}`}>
                  <strong>{brl(row.net)}</strong>
                </td>
                <td className="num">{row.count}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 1 ? (
            <tfoot>
              <tr className="is-total">
                <td>
                  <strong>Total dos eventos</strong>
                </td>
                <td className="num">
                  <strong>{brl(total.income)}</strong>
                </td>
                <td className="num">
                  <strong>{brl(total.expense)}</strong>
                </td>
                <td className="num">
                  <strong>{brl(total.net)}</strong>
                </td>
                <td className="num">
                  <strong>{total.count}</strong>
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </article>
  );
}

/** Público interno escolhido no filtro: quem pagou, quanto e quando. */
function TypePayersView({ data }: { data: TypePayers }) {
  return (
    <article className="card report-section">
      <div className="report-section__head">
        <h3>Associados pagantes · {data.name}</h3>
        <span className="muted">{data.payers.length} associado(s)</span>
      </div>
      <div className="table-wrap">
        <table className="data report-summary">
          <thead>
            <tr>
              <th scope="col">Associado</th>
              <th scope="col">Ramo</th>
              <th scope="col">Último pagamento</th>
              <th scope="col" className="num">
                Pagamentos
              </th>
              <th scope="col" className="num">
                Valor pago
              </th>
            </tr>
          </thead>
          <tbody>
            {data.payers.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nenhuma entrada deste tipo vinculada a associado no período.
                </td>
              </tr>
            ) : (
              data.payers.map((payer) => (
                <tr key={payer.memberId}>
                  <td>{payer.name}</td>
                  <td>{BRANCH_LABELS[payer.branch]}</td>
                  <td>{formatDate(payer.lastDate)}</td>
                  <td className="num">{payer.count}</td>
                  <td className="num is-pos">{brl(payer.amount)}</td>
                </tr>
              ))
            )}
            {data.unlinked.count ? (
              <tr>
                <td colSpan={3} className="muted">
                  Sem associado vinculado (identifique no fluxo de caixa)
                </td>
                <td className="num">{data.unlinked.count}</td>
                <td className="num is-pos">{brl(data.unlinked.amount)}</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="is-total">
              <td colSpan={4}>
                <strong>Total recebido</strong>
              </td>
              <td className="num">
                <strong>{brl(data.total)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
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

/** Resultado em uma frase, antes dos números: o que a pessoa quer saber primeiro. */
function ResultSentence({ result, from, to }: { result: Result; from: string; to: string }) {
  const period = `De ${formatDate(from)} a ${formatDate(to)}`;
  let text: string;
  if (result.kind === "delinquency") {
    const { members, count, amount } = result.data.totals;
    text = members
      ? `${period}, ${members} associado(s) ficaram devendo ${count} mensalidade(s), somando ${brl(amount)}.`
      : `${period}, ninguém ficou devendo mensalidade.`;
  } else {
    const income = result.kind === "custom" ? result.data.totals.income : result.data.income;
    const expense = result.kind === "custom" ? result.data.totals.expense : result.data.expense;
    const closing = result.kind === "custom" ? result.data.closing : result.data.closingBalance;
    const net = income - expense;
    const parts = [income ? `entraram ${brl(income)}` : "", expense ? `saíram ${brl(expense)}` : ""].filter(Boolean);
    if (!parts.length) text = `${period}, não houve movimentação com esses filtros.`;
    else if (income && expense)
      text = `${period}, ${parts.join(" e ")}: ${net >= 0 ? `sobraram ${brl(net)}` : `faltaram ${brl(-net)}`}.`;
    else text = `${period}, ${parts[0]}.`;
    if (result.kind === "assembly" || (result.kind === "custom" && income && expense)) {
      text += ` O caixa terminou o período com ${brl(closing)}.`;
    }
  }
  return <p className="report-sentence">{text}</p>;
}

/** Cada real do caixa num destino só (mesma divisão do Extrato dos ramos); a soma é o saldo final. */
function DestinationsView({ data }: { data: AssemblyReport }) {
  const rows = data.destinations.rows.filter((row) => row.opening || row.income || row.expense || row.balance);
  const closes = Math.abs(data.destinations.total - data.closingBalance) < 0.01;
  return (
    <article className="card report-section">
      <div className="report-section__head">
        <h3>Para onde foi cada real</h3>
      </div>
      <p className="muted">
        A mensalidade é dividida como foi gravada no pagamento: a parte operacional fica no caixa do grupo, a caixinha
        vai para o ramo do jovem, o lanche para o fundo do lanche e a taxa do clube fica reservada até o repasse.
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Destino</th>
              <th className="num">Saldo anterior</th>
              <th className="num">Entradas</th>
              <th className="num">Saídas</th>
              <th className="num">Saldo em {formatDate(data.to)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.bucket}>
                <td>{row.label}</td>
                <td className="num">{brl(row.opening)}</td>
                <td className="num is-pos">{brl(row.income)}</td>
                <td className="num is-neg">{brl(row.expense)}</td>
                <td className="num">{brl(row.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="is-total">
              <td>
                <strong>Total</strong>
                {closes ? null : <span className="error"> · não bate com o saldo final do caixa</span>}
              </td>
              <td className="num">
                <strong>{brl(rows.reduce((sum, row) => sum + row.opening, 0))}</strong>
              </td>
              <td className="num">
                <strong>{brl(rows.reduce((sum, row) => sum + row.income, 0))}</strong>
              </td>
              <td className="num">
                <strong>{brl(rows.reduce((sum, row) => sum + row.expense, 0))}</strong>
              </td>
              <td className="num">
                <strong>{brl(data.destinations.total)}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </article>
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
      <DestinationsView data={data} />
      <div className="report-cols">
        <article className="card report-section">
          <h3>Principais tipos de movimentação</h3>
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
