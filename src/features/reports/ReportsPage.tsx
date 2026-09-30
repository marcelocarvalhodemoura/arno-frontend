import { useEffect, useMemo, useState } from "react";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  YOUTH_BRANCHES,
  type BranchId,
  type CustomReportQuery,
  type CustomReportRow,
  type FiscalLedgerLine,
  type MovementType,
  type ReportGroupBy,
  type TxNature,
  type TxType,
} from "@/domain";
import logo from "@/shared/assets/arno_logo.png";
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

type Result = {
  rows: CustomReportRow[];
  totals: CustomReportRow;
  ledger: FiscalLedgerLine[];
  opening: number;
  closing: number;
};

const GROUP_BY_LABELS: Record<ReportGroupBy, string> = {
  none: "Lançamento a lançamento",
  month: "Mês",
  branch: "Ramo",
  movementType: "Tipo de movimentação",
  nature: "Natureza (fixa/variável)",
  account: "Conta (titular)",
};

type ReportModelId = "fiscal" | "byBranch" | "byMovementType" | "byAccount";

const REPORT_MODELS: Record<
  ReportModelId,
  {
    label: string;
    kicker: string;
    title: string;
    subtitle: string;
    purpose: string;
    documentTitle: string;
    csvPrefix: string;
    defaultGroupBy: ReportGroupBy;
    showSignatures: boolean;
  }
> = {
  fiscal: {
    label: "Comissão fiscal",
    kicker: "Comissão fiscal",
    title: "Relatório de movimentações",
    subtitle: "Livro-caixa numerado, com saldo acumulado, para conferência criteriosa da comissão fiscal do grupo.",
    purpose: "Prestação de contas à comissão fiscal",
    documentTitle: "Livro-caixa",
    csvPrefix: "comissao-fiscal-arno",
    defaultGroupBy: "movementType",
    showSignatures: true,
  },
  byBranch: {
    label: "Por ramo",
    kicker: "Relatórios",
    title: "Relatório por ramo",
    subtitle:
      "Síntese por ramo (visão gerencial). Na mensalidade entra só a caixinha (R$ 8,00). Saldos não são o livro-caixa do grupo.",
    purpose: "Relatório gerencial por ramo",
    documentTitle: "Por ramo",
    csvPrefix: "relatorio-ramo-arno",
    defaultGroupBy: "branch",
    showSignatures: false,
  },
  byMovementType: {
    label: "Por tipo de movimentação",
    kicker: "Relatórios",
    title: "Relatório por tipo de movimentação",
    subtitle: "Entradas e saídas consolidadas por tipo de conta / movimentação.",
    purpose: "Relatório gerencial por tipo de movimentação",
    documentTitle: "Por tipo",
    csvPrefix: "relatorio-tipo-arno",
    defaultGroupBy: "movementType",
    showSignatures: false,
  },
  byAccount: {
    label: "Por conta",
    kicker: "Relatórios",
    title: "Relatório por conta",
    subtitle: "Movimentações agrupadas pelo titular da conta vinculada ao lançamento.",
    purpose: "Relatório gerencial por conta",
    documentTitle: "Por conta",
    csvPrefix: "relatorio-conta-arno",
    defaultGroupBy: "account",
    showSignatures: false,
  },
};

const ALL_LABEL = "Todos (sem filtro)";

export default function Reports() {
  const { year, month } = usePeriod();
  const { name: issuerName, user: issuerUser } = useAuth();
  const { start, stop } = useLoadingBar();
  const range = periodRange(year, month);
  const [modelId, setModelId] = useState<ReportModelId>("fiscal");
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [branches, setBranches] = useState<BranchId[]>([]);
  const [types, setTypes] = useState<TxType[]>([]);
  const [natures, setNatures] = useState<TxNature[]>([]);
  const [movementTypeIds, setMovementTypeIds] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<ReportGroupBy>(REPORT_MODELS.fiscal.defaultGroupBy);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [movementTypes, setMovementTypes] = useState<MovementType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [summaryQuery, setSummaryQuery] = useState("");
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [printing, setPrinting] = useState(false);
  const [filtersDirty, setFiltersDirty] = useState(false);

  const summaryRows = useMemo(
    () =>
      (result?.rows ?? []).filter((row) =>
        matchesQuery(summaryQuery, [row.label, row.income, row.expense, row.net, row.count]),
      ),
    [result, summaryQuery],
  );
  const ledgerRows = useMemo(
    () =>
      (result?.ledger ?? []).filter((line) =>
        matchesQuery(ledgerQuery, [
          line.description,
          line.movementType,
          line.memberName,
          line.guardianName,
          line.accountHolder,
          BRANCH_LABELS[line.branch],
          typeLabel(line.type),
          natureLabel(line.nature),
          line.createdByName,
          line.updatedByName,
          originLabel(line.origin, line.importSource),
        ]),
      ),
    [result, ledgerQuery],
  );
  const summaryListing = usePagedList(summaryRows, `${summaryQuery}|${result?.ledger.length ?? 0}|summary`);
  const ledgerListing = usePagedList(ledgerRows, `${ledgerQuery}|${result?.ledger.length ?? 0}|ledger`);

  useEffect(() => {
    const next = periodRange(year, month);
    setFrom(next.from);
    setTo(next.to);
  }, [year, month]);

  useEffect(() => {
    start();
    setTypesLoading(true);
    void api<MovementType[]>("/movement-types")
      .then(setMovementTypes)
      .finally(() => {
        setTypesLoading(false);
        stop();
      });
  }, [start, stop]);

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

  const filterSummary = useMemo(
    () => ({
      branches: branches.length ? branches.map((id) => BRANCH_LABELS[id]).join(", ") : ALL_LABEL,
      types: types.length ? types.map(typeLabel).join(", ") : "Entradas e saídas",
      natures: natures.length ? natures.map(natureLabel).join(", ") : "Fixas e variáveis",
      movementTypes: movementTypeIds.length
        ? movementTypes
            .filter((t) => movementTypeIds.includes(t.id))
            .map((t) => t.name)
            .join(", ")
        : ALL_LABEL,
    }),
    [branches, types, natures, movementTypeIds, movementTypes],
  );

  // Na impressão o documento é a prestação de contas completa: sem paginação de tela.
  const summaryPrintRows = printing ? summaryRows : summaryListing.pageRows;
  const ledgerPrintRows = printing ? ledgerRows : ledgerListing.pageRows;
  const model = REPORT_MODELS[modelId];

  function toggle<T extends string>(list: T[], value: T, setter: (v: T[]) => void) {
    setter(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
    if (result) setFiltersDirty(true);
  }

  function selectModel(next: ReportModelId) {
    setModelId(next);
    setGroupBy(REPORT_MODELS[next].defaultGroupBy);
    setResult(null);
    setFiltersDirty(false);
  }

  function markFiltersDirty() {
    if (result) setFiltersDirty(true);
  }

  async function run() {
    setBusy(true);
    start();
    try {
      const query: CustomReportQuery = {
        from,
        to,
        branches,
        types,
        natures,
        movementTypeIds,
        groupBy,
      };
      const data = await api<Result>("/reports/custom", {
        method: "POST",
        body: JSON.stringify(query),
      });
      setResult(data);
      setIssuedAt(new Date().toISOString());
      setFiltersDirty(false);
    } finally {
      setBusy(false);
      stop();
    }
  }

  function exportCsv() {
    if (!result) return;
    const rows = result.ledger.map((line) => ({
      Seq: line.seq,
      Data: formatDate(line.date),
      Tipo: typeLabel(line.type),
      Natureza: natureLabel(line.nature),
      Movimentação: line.movementType,
      Ramo: BRANCH_LABELS[line.branch],
      Associado: line.memberName ?? "",
      Responsável: line.guardianName ?? "",
      Conta: line.accountHolder ?? "",
      Descrição: line.description,
      "Lançado por": line.createdByName,
      "Registrado em": formatDateTime(line.createdAt),
      Situação: auditAction(line.updatedAt, line.createdAt),
      Origem: originLabel(line.origin, line.importSource),
      "Alterado por": line.updatedByName ?? "",
      "Alterado em": line.updatedAt ? formatDateTime(line.updatedAt) : "",
      Entrada: line.income,
      Saída: line.expense,
      Saldo: line.balance,
    }));
    downloadCsv(`${model.csvPrefix}-${from}-${to}.csv`, toCsv(rows));
  }

  return (
    <div className="fiscal-report">
      <div className="no-print">
        <PageHeader
          kicker={model.kicker}
          title={model.title}
          subtitle={model.subtitle}
          actions={
            <div className="page-head__actions">
              <PageGuide guide={reportsGuide} />
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setPrinting(true)}
                disabled={!result || printing}
              >
                {printing ? "Preparando…" : "Imprimir"}
              </button>
              <SubmitButton type="button" busy={busy} busyLabel="Gerando…" onClick={() => void run()}>
                Gerar relatório
              </SubmitButton>
            </div>
          }
        />
      </div>

      <article className="card no-print" style={{ marginBottom: 16 }}>
        <div className="form-grid">
          <label className="field wide">
            <span>Tipo de relatório</span>
            <SearchableSelect
              value={modelId}
              onChange={(value) => selectModel(value as ReportModelId)}
              placeholder="Selecione"
              options={(Object.keys(REPORT_MODELS) as ReportModelId[]).map((id) => ({
                value: id,
                label: REPORT_MODELS[id].label,
              }))}
            />
          </label>
          <label className="field">
            <span>De</span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                markFiltersDirty();
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
                markFiltersDirty();
              }}
            />
          </label>
          <label className="field">
            <span>Agrupar síntese</span>
            <SearchableSelect
              value={groupBy}
              onChange={(value) => {
                setGroupBy(value as ReportGroupBy);
                markFiltersDirty();
              }}
              placeholder="Selecione"
              options={[
                { value: "none", label: "Lançamento a lançamento" },
                { value: "month", label: "Mês" },
                { value: "branch", label: "Ramo" },
                { value: "movementType", label: "Tipo de movimentação" },
                { value: "nature", label: "Natureza (fixa/variável)" },
                { value: "account", label: "Conta (titular)" },
              ]}
            />
          </label>
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
            <span>Tipos de movimentação</span>
            <FetchOverlay active={typesLoading} label="Carregando tipos…">
              <div className="check-row">
                {typesLoading && movementTypes.length === 0 ? (
                  <span className="muted">Carregando tipos de movimentação…</span>
                ) : null}
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
            </FetchOverlay>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 12 }}>
          Sem filtro marcado, o relatório inclui todas as movimentações do período.
          {groupBy === "branch"
            ? " Com agrupamento por ramo, a mensalidade entra só com a caixinha (R$ 8) e o saldo é gerencial (não é o caixa do grupo)."
            : " Com filtro de ramo na comissão fiscal, os valores da mensalidade permanecem integrais."}
          {filtersDirty ? (
            <>
              {" "}
              <strong>Filtros alterados — clique em Gerar relatório para atualizar.</strong>
            </>
          ) : null}
        </p>
      </article>

      {busy && !result ? <PageLoader label="Gerando relatório…" /> : null}

      {result ? (
        <FetchOverlay active={busy} label="Gerando relatório…">
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
                    <em>{model.purpose}</em>
                  </td>
                  <td className="report-letterhead__period">
                    <span>Documento</span>
                    <strong>{model.documentTitle}</strong>
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
                <tr>
                  <th>Grupo</th>
                  <td>G.E. Arno Friedrich · 43/RS</td>
                  <th>Lançamentos</th>
                  <td>{result.ledger.length}</td>
                </tr>
                <tr>
                  <th>Documento</th>
                  <td>{model.purpose}</td>
                  <th>Direção</th>
                  <td>{filterSummary.types}</td>
                </tr>
                <tr>
                  <th>Ramos</th>
                  <td>{filterSummary.branches}</td>
                  <th>Natureza</th>
                  <td>{filterSummary.natures}</td>
                </tr>
                <tr>
                  <th>Síntese agrupada por</th>
                  <td>{GROUP_BY_LABELS[groupBy]}</td>
                  <th>Tipos de movimentação</th>
                  <td>{filterSummary.movementTypes}</td>
                </tr>
                <tr>
                  <th>Modelo</th>
                  <td>{model.label}</td>
                  <th>Emitido por</th>
                  <td>
                    {issuerName ?? "Tesouraria"}
                    {issuerUser ? ` (@${issuerUser})` : ""}
                    {issuedAt ? ` · ${formatDateTime(issuedAt)}` : ""}
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="data report-balance">
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
                  <td className="num">{brl(result.opening)}</td>
                  <td className="num is-pos">{brl(result.totals.income)}</td>
                  <td className="num is-neg">{brl(result.totals.expense)}</td>
                  <td className="num">{brl(result.totals.net)}</td>
                  <td className="num">{brl(result.closing)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid-stats no-print" style={{ marginBottom: 16 }}>
            <StatCard title="Saldo inicial" value={brl(result.opening)} />
            <StatCard title="Entradas" value={brl(result.totals.income)} tone="pos" />
            <StatCard title="Saídas" value={brl(result.totals.expense)} tone="neg" />
            <StatCard title="Saldo final" value={brl(result.closing)} />
          </div>

          <article className="card" style={{ marginBottom: 16 }}>
            <div className="page-head" style={{ marginBottom: 12 }}>
              <h3>Síntese</h3>
              <button className="btn btn-outline no-print" type="button" onClick={exportCsv}>
                Exportar CSV
              </button>
            </div>
            <FilterBar>
              <label className="field">
                <span>Buscar síntese</span>
                <input
                  value={summaryQuery}
                  onChange={(e) => setSummaryQuery(e.target.value)}
                  placeholder="Grupo ou descrição…"
                />
              </label>
            </FilterBar>
            <ListingResults fetching={busy} filtering={summaryListing.busy} fetchLabel="Gerando relatório…">
              <div className="table-wrap">
                <table className="data report-summary">
                  <caption className="print-only">Síntese por {GROUP_BY_LABELS[groupBy].toLowerCase()}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{groupBy === "none" ? "Descrição" : "Grupo"}</th>
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
                        Qtd.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryPrintRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="muted">
                          Nenhum grupo com esses filtros.
                        </td>
                      </tr>
                    ) : (
                      summaryPrintRows.map((r) => (
                        <tr key={r.key}>
                          <td>{r.label}</td>
                          <td className="num is-pos">{brl(r.income)}</td>
                          <td className="num is-neg">{brl(r.expense)}</td>
                          <td className="num">{brl(r.net)}</td>
                          <td className="num">{r.count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="is-total">
                      <td>
                        <strong>Total</strong>
                      </td>
                      <td className="num">
                        <strong>{brl(result.totals.income)}</strong>
                      </td>
                      <td className="num">
                        <strong>{brl(result.totals.expense)}</strong>
                      </td>
                      <td className="num">
                        <strong>{brl(result.totals.net)}</strong>
                      </td>
                      <td className="num">
                        <strong>{result.totals.count}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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
            </ListingResults>
          </article>

          <article className="card">
            <h3 style={{ marginBottom: 12 }}>Livro-caixa</h3>
            <FilterBar>
              <label className="field">
                <span>Buscar lançamento</span>
                <input
                  value={ledgerQuery}
                  onChange={(e) => setLedgerQuery(e.target.value)}
                  placeholder="Descrição, associado, tipo…"
                />
              </label>
            </FilterBar>
            <ListingResults fetching={busy} filtering={ledgerListing.busy} fetchLabel="Gerando relatório…">
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
                      <th>Tipo</th>
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
                        <strong>{brl(result.opening)}</strong>
                      </td>
                    </tr>
                    {ledgerPrintRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="muted">
                          Nenhum lançamento com esses filtros.
                        </td>
                      </tr>
                    ) : (
                      ledgerPrintRows.map((line) => (
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
                              {" · "}
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
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="is-total">
                      <td>—</td>
                      <td>{formatDate(to)}</td>
                      <td colSpan={3}>
                        <strong>Saldo final conferido</strong>
                      </td>
                      <td className="num">
                        <strong>{brl(result.totals.income)}</strong>
                      </td>
                      <td className="num">
                        <strong>{brl(result.totals.expense)}</strong>
                      </td>
                      <td className="num">
                        <strong>{brl(result.closing)}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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
            </ListingResults>
            <p className="muted no-print" style={{ marginTop: 16 }}>
              {model.showSignatures ? "Documento gerado para conferência da comissão fiscal." : `${model.purpose}.`}{" "}
              Ramos do grupo: {YOUTH_BRANCHES.map((b) => b.unit).join(", ")} e Grupo.
            </p>
            {model.showSignatures ? (
              <div className="sign-row no-print">
                <div>
                  <span>Tesouraria</span>
                </div>
                <div>
                  <span>Comissão fiscal</span>
                </div>
                <div>
                  <span>Diretoria</span>
                </div>
              </div>
            ) : null}

            <div className="print-only report-closing">
              {model.showSignatures ? (
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
                      {YOUTH_BRANCHES.map((b) => b.unit).join(", ")} e Grupo. Documento emitido pelo sistema de
                      tesouraria
                      {model.showSignatures
                        ? " para conferência da comissão fiscal"
                        : ` · ${model.purpose.toLowerCase()}`}
                      {issuedAt ? ` em ${formatDateTime(issuedAt)}` : ""}.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </FetchOverlay>
      ) : null}
    </div>
  );
}
