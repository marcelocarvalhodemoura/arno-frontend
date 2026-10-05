import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BRANCH_LABELS, type BranchId } from "@/domain";
import { PageGuide, snackFundGuide } from "@/features/help";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, MONTHS } from "@/shared/lib/format";
import { usePeriod } from "@/shared/lib/period";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import FilterBar from "@/shared/ui/FilterBar";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import { PeriodField } from "@/shared/ui/PeriodControl";
import StatCard, { Badge } from "@/shared/ui/StatCard";

type SnackFundIncomeLine = {
  transactionId: string;
  memberId: string;
  memberName: string;
  branch: string;
  dueDate: string;
  paidAt: string;
  amountPaid: number;
  snackShare: number;
  competenceMonth: number;
};

type SnackFundExpenseLine = {
  transactionId: string;
  date: string;
  description: string;
  movementTypeName: string;
  amount: number;
  branch: string;
};

type SnackFundPreview = {
  year: number;
  month: number;
  snackShareUnit: number;
  incomeLines: SnackFundIncomeLine[];
  expenseLines: SnackFundExpenseLine[];
  collected: number;
  spent: number;
  available: number;
  incomeCount: number;
  expenseCount: number;
};

type SnackFundMonthSummary = {
  month: number;
  incomeCount: number;
  collected: number;
  spent: number;
  available: number;
};

type SnackFundYearSummary = {
  year: number;
  snackShareUnit: number;
  months: SnackFundMonthSummary[];
  collected: number;
  spent: number;
  available: number;
};

function isYearSummary(data: SnackFundPreview | SnackFundYearSummary): data is SnackFundYearSummary {
  return "months" in data;
}

function formatDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function branchLabel(branch: string) {
  return BRANCH_LABELS[branch as BranchId] ?? branch;
}

export default function SnackFundPage() {
  const { year, month, setYear, setMonth } = usePeriod();

  const path = useMemo(() => {
    if (!month) return `/snack-fund?year=${year}`;
    return `/snack-fund?year=${year}&month=${month}`;
  }, [year, month]);

  const list = useFetch<SnackFundPreview | SnackFundYearSummary>(path);

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando taxa do lanche…" />;
  }

  const data = list.data;
  const periodLabel = month ? `${MONTHS[month - 1]} de ${year}` : `todo o ano de ${year}`;

  return (
    <FetchOverlay active={list.loading} label="Atualizando taxa do lanche…">
      <div>
        <PageHeader
          kicker="Movimentações"
          title="Taxa do lanche"
          subtitle={`Parte do lanche de cada mensalidade paga, conforme a Composição da mensalidade. Disponível em ${periodLabel} = arrecadado − gastos de Lanche/Alimentação.`}
          actions={
            <div className="page-head__actions">
              <PageGuide guide={snackFundGuide} />
              <Link className="btn btn-outline" to="/fluxo">
                Abrir caixa
              </Link>
            </div>
          }
        />

        <FilterBar>
          <PeriodField year={year} month={month} setYear={setYear} setMonth={setMonth} />
        </FilterBar>

        <div className="grid-stats">
          <StatCard
            title="Arrecadado"
            value={brl(data.collected)}
            hint={
              isYearSummary(data)
                ? "Parte do lanche das mensalidades pagas no ano"
                : `${(data as SnackFundPreview).incomeCount} mensalidade(s) · parte do lanche de cada uma`
            }
            tone="pos"
          />
          <StatCard
            title="Gasto"
            value={brl(data.spent)}
            hint="Saídas Lanche / Alimentação no período"
            tone={data.spent > 0 ? "neg" : ""}
          />
          <StatCard
            title="Disponível"
            value={brl(data.available)}
            hint="Arrecadado menos gasto"
            tone={data.available >= 0 ? "pos" : "neg"}
          />
        </div>

        {isYearSummary(data) ? (
          <article className="card" style={{ marginTop: "1rem" }}>
            <p className="muted" style={{ marginTop: 0 }}>
              Selecione um mês no período para ver quem contribuiu e quais gastos entraram.
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="num">Mensalidades</th>
                    <th className="num">Arrecadado</th>
                    <th className="num">Gasto</th>
                    <th className="num">Disponível</th>
                    <th className="cell-actions">Ações</th>
                  </tr>
                </thead>
                <AnimatedTableBody emptyColSpan={6} emptyMessage="Nenhuma movimentação de lanche neste ano.">
                  {data.months.map((row, index) => (
                    <AnimatedRow key={row.month} index={index}>
                      <td>
                        <strong>{MONTHS[row.month - 1]}</strong>
                      </td>
                      <td className="num">{row.incomeCount}</td>
                      <td className="num">{brl(row.collected)}</td>
                      <td className="num">{brl(row.spent)}</td>
                      <td className="num">
                        <Badge kind={row.available >= 0 ? "paid" : "overdue"}>{brl(row.available)}</Badge>
                      </td>
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
        ) : (
          <>
            <article className="card" style={{ marginTop: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>Arrecadação (mensalidades pagas)</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Associado</th>
                      <th>Ramo</th>
                      <th>Competência</th>
                      <th>Pago em</th>
                      <th className="num">Mensalidade</th>
                      <th className="num">Lanche</th>
                    </tr>
                  </thead>
                  <AnimatedTableBody
                    emptyColSpan={6}
                    emptyMessage="Nenhuma mensalidade com parcela de lanche paga neste mês."
                  >
                    {data.incomeLines.map((line, index) => (
                      <AnimatedRow key={line.transactionId} index={index}>
                        <td>
                          <strong>{line.memberName}</strong>
                        </td>
                        <td>{branchLabel(line.branch)}</td>
                        <td>{MONTHS[line.competenceMonth - 1] ?? line.competenceMonth}</td>
                        <td>{formatDate(line.paidAt)}</td>
                        <td className="num">{brl(line.amountPaid)}</td>
                        <td className="num">{brl(line.snackShare)}</td>
                      </AnimatedRow>
                    ))}
                  </AnimatedTableBody>
                </table>
              </div>
            </article>

            <article className="card" style={{ marginTop: "1rem" }}>
              <h3 style={{ marginTop: 0 }}>Gastos (Lanche / Alimentação)</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Ramo</th>
                      <th className="num">Valor</th>
                    </tr>
                  </thead>
                  <AnimatedTableBody emptyColSpan={5} emptyMessage="Nenhum gasto de lanche/alimentação neste mês.">
                    {data.expenseLines.map((line, index) => (
                      <AnimatedRow key={line.transactionId} index={index}>
                        <td>{formatDate(line.date)}</td>
                        <td>
                          <strong>{line.description}</strong>
                        </td>
                        <td>{line.movementTypeName}</td>
                        <td>{branchLabel(line.branch)}</td>
                        <td className="num">{brl(line.amount)}</td>
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
