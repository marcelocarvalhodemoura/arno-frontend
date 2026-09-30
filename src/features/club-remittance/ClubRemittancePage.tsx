import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BRANCH_LABELS, type BranchId } from "@/domain";
import { PageGuide, clubRemittanceGuide } from "@/features/help";
import { api } from "@/core/http";
import { useFetch } from "@/shared/hooks/use-fetch";
import { useToast } from "@/shared/feedback/toast";
import { brl, MONTHS, methodLabel } from "@/shared/lib/format";
import { usePeriod } from "@/shared/lib/period";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import FilterBar from "@/shared/ui/FilterBar";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import { PeriodField } from "@/shared/ui/PeriodControl";
import StatCard, { Badge } from "@/shared/ui/StatCard";
import SubmitButton from "@/shared/ui/SubmitButton";

type ClubRemittanceLine = {
  transactionId: string;
  memberId: string;
  memberName: string;
  branch: string;
  dueDate: string;
  paidAt: string;
  amountPaid: number;
  clubShare: number;
  late: boolean;
  competenceMonth: number;
};

type ClubRemittanceRecord = {
  transactionId: string;
  date: string;
  amount: number;
  description: string;
  method: string;
  notes?: string;
};

type ClubRemittancePreview = {
  year: number;
  month: number;
  clubShareOnTime: number;
  clubShareLate: number;
  lines: ClubRemittanceLine[];
  total: number;
  count: number;
  remittance: ClubRemittanceRecord | null;
};

type ClubRemittanceMonthSummary = {
  month: number;
  count: number;
  total: number;
  remitted: boolean;
  remittanceAmount: number | null;
};

type ClubRemittanceYearSummary = {
  year: number;
  clubShareOnTime: number;
  clubShareLate: number;
  months: ClubRemittanceMonthSummary[];
  totalDue: number;
  totalRemitted: number;
};

function isYearSummary(data: ClubRemittancePreview | ClubRemittanceYearSummary): data is ClubRemittanceYearSummary {
  return "months" in data;
}

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function branchLabel(branch: string) {
  return BRANCH_LABELS[branch as BranchId] ?? branch;
}

export default function ClubRemittancePage() {
  const toast = useToast();
  const { year, month, setYear, setMonth } = usePeriod();
  const [registerDate, setRegisterDate] = useState(isoToday);
  const [saving, setSaving] = useState(false);

  const path = useMemo(() => {
    if (!month) return `/club-remittance?year=${year}`;
    return `/club-remittance?year=${year}&month=${month}`;
  }, [year, month]);

  const list = useFetch<ClubRemittancePreview | ClubRemittanceYearSummary>(path);

  async function registerRemittance(preview: ClubRemittancePreview) {
    if (preview.remittance) return;
    if (preview.total <= 0) {
      toast.error("Não há valor a repassar neste mês.");
      return;
    }
    const label = `${MONTHS[preview.month - 1]} / ${preview.year}`;
    if (
      !confirm(
        `Registrar saída de ${brl(preview.total)} referente ao repasse Lindóia de ${label} (${preview.count} mensalidade(s))?`,
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      await api("/club-remittance", {
        method: "POST",
        body: JSON.stringify({
          year: preview.year,
          month: preview.month,
          date: registerDate || isoToday(),
          method: "transfer",
        }),
      });
      toast.success(`Repasse de ${label} registrado no caixa.`);
      await list.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar o repasse");
    } finally {
      setSaving(false);
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando repasse ao clube…" />;
  }

  const data = list.data;
  const periodLabel = month ? `${MONTHS[month - 1]} de ${year}` : `todo o ano de ${year}`;

  return (
    <FetchOverlay active={list.loading} label="Atualizando repasse…">
      <div>
        <PageHeader
          kicker="Movimentações"
          title="Repasse ao clube"
          subtitle={`Taxa Lindóia embutida nas mensalidades pagas em ${periodLabel}. Diluição de R$ 4,50 fica com o grupo.`}
          actions={<PageGuide guide={clubRemittanceGuide} />}
        />

        <FilterBar>
          <PeriodField year={year} month={month} setYear={setYear} setMonth={setMonth} />
        </FilterBar>

        {isYearSummary(data) ? (
          <>
            <div className="grid-stats">
              <StatCard
                title="A repassar no ano"
                value={brl(data.totalDue)}
                hint="Soma da taxa Lindóia nos pagamentos do ano"
              />
              <StatCard
                title="Já repassado"
                value={brl(data.totalRemitted)}
                hint="Saídas já registradas no caixa"
                tone={data.totalRemitted > 0 ? "pos" : ""}
              />
              <StatCard
                title="Pontual / atraso"
                value={`${brl(data.clubShareOnTime)} · ${brl(data.clubShareLate)}`}
                hint="Valor unitário da taxa Lindóia"
              />
            </div>

            <article className="card" style={{ marginTop: "1rem" }}>
              <p className="muted" style={{ marginTop: 0 }}>
                Selecione um mês no período para ver o detalhe e registrar o repasse.
              </p>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th className="num">Mensalidades</th>
                      <th className="num">A repassar</th>
                      <th>Status</th>
                      <th className="num">Registrado</th>
                      <th className="cell-actions">Ações</th>
                    </tr>
                  </thead>
                  <AnimatedTableBody emptyColSpan={6} emptyMessage="Nenhum pagamento com taxa do clube neste ano.">
                    {data.months.map((row, index) => (
                      <AnimatedRow key={row.month} index={index}>
                        <td>
                          <strong>{MONTHS[row.month - 1]}</strong>
                        </td>
                        <td className="num">{row.count}</td>
                        <td className="num">{brl(row.total)}</td>
                        <td>
                          <Badge kind={row.remitted ? "paid" : row.total > 0 ? "pending" : "inactive"}>
                            {row.remitted ? "Repassado" : row.total > 0 ? "Pendente" : "—"}
                          </Badge>
                        </td>
                        <td className="num">{row.remittanceAmount != null ? brl(row.remittanceAmount) : "—"}</td>
                        <td className="cell-actions">
                          <button className="btn btn-outline btn-sm" type="button" onClick={() => setMonth(row.month)}>
                            Abrir mês
                          </button>
                        </td>
                      </AnimatedRow>
                    ))}
                  </AnimatedTableBody>
                </table>
              </div>
            </article>
          </>
        ) : (
          <>
            <div className="grid-stats">
              <StatCard
                title="A repassar"
                value={brl(data.total)}
                hint={`${data.count} mensalidade(s) paga(s) com taxa do clube`}
                tone={data.total > 0 && !data.remittance ? "neg" : ""}
              />
              <StatCard
                title="Status"
                value={data.remittance ? "Repassado" : data.total > 0 ? "Pendente" : "Sem valor"}
                hint={
                  data.remittance
                    ? `Registrado em ${formatDate(data.remittance.date)} · ${methodLabel(data.remittance.method)}`
                    : "Baseado na data de pagamento (pago no mês)"
                }
                tone={data.remittance ? "pos" : ""}
              />
              <StatCard
                title="Pontual / atraso"
                value={`${brl(data.clubShareOnTime)} · ${brl(data.clubShareLate)}`}
                hint="Taxa Lindóia unitária (sem diluição)"
              />
            </div>

            <article className="card" style={{ marginTop: "1rem" }}>
              <div className="toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "end" }}>
                {data.remittance ? (
                  <Link className="btn btn-outline" to="/fluxo">
                    Ver no caixa
                  </Link>
                ) : (
                  <>
                    <label className="field" style={{ margin: 0 }}>
                      <span>Data do repasse</span>
                      <input type="date" value={registerDate} onChange={(e) => setRegisterDate(e.target.value)} />
                    </label>
                    <SubmitButton
                      className="btn btn-primary"
                      type="button"
                      busy={saving}
                      disabled={data.total <= 0 || saving}
                      onClick={() => void registerRemittance(data)}
                    >
                      Registrar repasse · {brl(data.total)}
                    </SubmitButton>
                  </>
                )}
              </div>

              {data.remittance ? (
                <p className="muted">
                  Saída <strong>{data.remittance.description}</strong> · {brl(data.remittance.amount)}.
                </p>
              ) : null}

              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Associado</th>
                      <th>Ramo</th>
                      <th>Competência</th>
                      <th>Vencimento</th>
                      <th>Pago em</th>
                      <th className="num">Mensalidade</th>
                      <th className="num">Repasse</th>
                      <th>Pontualidade</th>
                    </tr>
                  </thead>
                  <AnimatedTableBody
                    emptyColSpan={8}
                    emptyMessage="Nenhuma mensalidade paga neste mês com a taxa do clube incluída."
                  >
                    {data.lines.map((line, index) => (
                      <AnimatedRow key={line.transactionId} index={index}>
                        <td>
                          <strong>{line.memberName}</strong>
                        </td>
                        <td>{branchLabel(line.branch)}</td>
                        <td>{MONTHS[line.competenceMonth - 1] ?? line.competenceMonth}</td>
                        <td>{formatDate(line.dueDate)}</td>
                        <td>{formatDate(line.paidAt)}</td>
                        <td className="num">{brl(line.amountPaid)}</td>
                        <td className="num">{brl(line.clubShare)}</td>
                        <td>
                          <Badge kind={line.late ? "overdue" : "paid"}>{line.late ? "Atraso" : "Pontual"}</Badge>
                        </td>
                      </AnimatedRow>
                    ))}
                  </AnimatedTableBody>
                </table>
              </div>
            </article>
          </>
        )}
      </div>
    </FetchOverlay>
  );
}
