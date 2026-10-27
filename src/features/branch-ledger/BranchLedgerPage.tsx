import { useState } from "react";
import { BRANCH_LABELS, type BranchId } from "@/domain";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, formatDate, monthLabel } from "@/shared/lib/format";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import FilterBar from "@/shared/ui/FilterBar";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import StatCard, { Badge } from "@/shared/ui/StatCard";

const LEDGER_BRANCHES: BranchId[] = ["filhote", "lobinho", "escoteiro", "senior", "pioneiro", "flor-de-lis"];

type BranchMonth = {
  yearMonth: string;
  caixinha: number;
  income: number;
  expense: number;
  net: number;
  balance: number;
};

type BranchSource = {
  kind: "caixinha" | "receita" | "saida";
  movementTypeId: string | null;
  name: string;
  amount: number;
  count: number;
};

type BranchStatement = {
  branch: BranchId;
  label: string;
  months: BranchMonth[];
  totals: { caixinha: number; income: number; expense: number; balance: number };
  sources: BranchSource[];
};

type BranchLine = {
  transactionId: string;
  date: string;
  kind: "caixinha" | "receita" | "saida";
  movementTypeName: string;
  description: string;
  memberName?: string;
  amount: number;
  paid?: number;
  dueDate?: string;
};

type MoneyMapRow = { bucket: string; label: string; income: number; expense: number; balance: number };

type MoneyMap = { until: string | null; rows: MoneyMapRow[]; total: number; cashBalance: number };

const KIND_LABELS: Record<BranchLine["kind"], string> = {
  caixinha: "Caixinha",
  receita: "Receita do ramo",
  saida: "Saída do ramo",
};

const KIND_BADGES: Record<BranchLine["kind"], string> = { caixinha: "split", receita: "income", saida: "expense" };

const BUCKET_HINTS: Record<string, string> = {
  grupo: "Saldo inicial + operacional, diluição, atraso e dívida das mensalidades + receitas e saídas do grupo",
  lanche: "Parte do lanche das mensalidades − saídas de Lanche/Alimentação do grupo",
  clube: "Taxa do clube das mensalidades − repasses lançados como “Repasse Lindóia Tênis Clube”",
  conferir: "Diferença entre o recebido e a tabela + mensalidades pagas sem associado (ver Conferência)",
};

function parseMoney(value: string): number | null {
  const clean = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

function MoneyMapCard() {
  const map = useFetch<MoneyMap>("/branch-ledger/money-map");
  const [bankDraft, setBankDraft] = useState("");
  if (!map.data) return map.error ? <p className="error">{map.error}</p> : null;
  const { rows, total, cashBalance } = map.data;
  const bank = parseMoney(bankDraft);
  const closes = Math.abs(total - cashBalance) < 0.01;

  return (
    <article className="card" style={{ marginTop: "1rem" }}>
      <h3 style={{ marginTop: 0 }}>Para onde foi cada real</h3>
      <p className="muted">
        Cada real que entrou no caixa está em um único destino. A soma dos destinos tem que dar o saldo de caixa.
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Destino</th>
              <th className="num">Entrou</th>
              <th className="num">Saiu</th>
              <th className="num">Saldo</th>
            </tr>
          </thead>
          <AnimatedTableBody emptyColSpan={4} emptyMessage="Nenhum lançamento.">
            {rows
              .filter((row) => row.income || row.expense)
              .map((row, index) => (
                <AnimatedRow key={row.bucket} index={index}>
                  <td>
                    <strong>{row.label}</strong>
                    {BUCKET_HINTS[row.bucket] ? <div className="muted">{BUCKET_HINTS[row.bucket]}</div> : null}
                  </td>
                  <td className="num">{brl(row.income)}</td>
                  <td className="num">{brl(row.expense)}</td>
                  <td className="num">
                    <Badge kind={row.balance >= 0 ? "paid" : "overdue"}>{brl(row.balance)}</Badge>
                  </td>
                </AnimatedRow>
              ))}
          </AnimatedTableBody>
          <tfoot>
            <tr>
              <td>
                <strong>Soma dos destinos</strong>
              </td>
              <td />
              <td />
              <td className="num">
                <strong>{brl(total)}</strong>
              </td>
            </tr>
            <tr>
              <td>Saldo de caixa do sistema</td>
              <td />
              <td />
              <td className="num">
                <Badge kind={closes ? "paid" : "overdue"}>{brl(cashBalance)}</Badge>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "end", marginTop: "0.75rem" }}>
        <label className="field" style={{ maxWidth: "16rem" }}>
          <span>Saldo no extrato do banco (hoje)</span>
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={bankDraft}
            onChange={(e) => setBankDraft(e.target.value)}
          />
        </label>
        {bank != null ? (
          Math.abs(bank - cashBalance) < 0.01 ? (
            <Badge kind="paid">Fecha com o banco</Badge>
          ) : (
            <p className="error" style={{ margin: 0 }}>
              Diferença de {brl(bank - cashBalance)} entre o banco e o sistema: há lançamento faltando ou a mais no
              caixa.
            </p>
          )
        ) : null}
      </div>
    </article>
  );
}

function MonthLines({ branch, yearMonth }: { branch: BranchId; yearMonth: string }) {
  const lines = useFetch<BranchLine[]>(`/branch-ledger/lines?branch=${branch}&month=${yearMonth}`);
  if (lines.error) return <p className="error">{lines.error}</p>;
  if (!lines.data) return <PageLoader label="Carregando lançamentos…" />;
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Data</th>
            <th>Origem</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th className="num">Valor para o ramo</th>
          </tr>
        </thead>
        <AnimatedTableBody emptyColSpan={5} emptyMessage="Nenhum lançamento do ramo neste mês.">
          {lines.data.map((line, index) => (
            <AnimatedRow key={`${line.kind}-${line.transactionId}`} index={index}>
              <td>{formatDate(line.date)}</td>
              <td>
                <Badge kind={KIND_BADGES[line.kind]}>{KIND_LABELS[line.kind]}</Badge>
              </td>
              <td>{line.movementTypeName}</td>
              <td>
                {line.kind === "caixinha" ? (
                  <>
                    <strong>{line.memberName}</strong>
                    <div className="muted">
                      Mensalidade de {line.dueDate ? monthLabel(line.dueDate.slice(0, 7)) : "—"}, paga{" "}
                      {brl(line.paid ?? 0)}
                    </div>
                  </>
                ) : (
                  <>
                    <strong>{line.description}</strong>
                    {line.memberName ? <div className="muted">{line.memberName}</div> : null}
                  </>
                )}
              </td>
              <td className="num">{line.kind === "saida" ? `− ${brl(line.amount)}` : brl(line.amount)}</td>
            </AnimatedRow>
          ))}
        </AnimatedTableBody>
      </table>
    </div>
  );
}

export default function BranchLedgerPage() {
  const [branch, setBranch] = useState<BranchId>("lobinho");
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const statement = useFetch<BranchStatement>(`/branch-ledger?branch=${branch}`);

  if (!statement.data) {
    if (statement.error) return <p className="error">{statement.error}</p>;
    return <PageLoader label="Carregando extrato do ramo…" />;
  }

  const { months, totals, sources } = statement.data;

  return (
    <FetchOverlay active={statement.loading} label="Atualizando extrato…">
      <div>
        <PageHeader
          kicker="Caixa"
          title="Extrato dos ramos"
          subtitle="Quanto cada ramo recebeu desde o início: caixinha das mensalidades dos jovens + receitas lançadas no ramo − saídas do ramo. A parte operacional da mensalidade fica no caixa do grupo."
        />

        <FilterBar>
          <label className="field">
            <span>Ramo</span>
            <select
              value={branch}
              onChange={(event) => {
                setBranch(event.target.value as BranchId);
                setOpenMonth(null);
              }}
            >
              {LEDGER_BRANCHES.map((item) => (
                <option key={item} value={item}>
                  {BRANCH_LABELS[item]}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>

        <div className="grid-stats">
          <StatCard
            title="Caixinha das mensalidades"
            value={brl(totals.caixinha)}
            hint="Divisão gravada em cada pagamento"
          />
          <StatCard
            title="Receitas do ramo"
            value={brl(totals.income)}
            hint="Eventos, vendas e inscrições lançados no ramo"
            tone="pos"
          />
          <StatCard
            title="Saídas do ramo"
            value={brl(totals.expense)}
            hint="Gastos lançados no ramo"
            tone={totals.expense ? "neg" : ""}
          />
          <StatCard
            title="Saldo do ramo"
            value={brl(totals.balance)}
            hint="Caixinha + receitas − saídas"
            tone={totals.balance >= 0 ? "pos" : "neg"}
          />
        </div>

        <article className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>Mês a mês</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th className="num">Caixinha</th>
                  <th className="num">Receitas</th>
                  <th className="num">Saídas</th>
                  <th className="num">Resultado</th>
                  <th className="num">Saldo acumulado</th>
                  <th className="cell-actions">Ações</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={7} emptyMessage="Nenhum lançamento deste ramo.">
                {months.map((row, index) => (
                  <AnimatedRow key={row.yearMonth} index={index}>
                    <td>
                      <strong>{monthLabel(row.yearMonth)}</strong>
                    </td>
                    <td className="num">{brl(row.caixinha)}</td>
                    <td className="num">{brl(row.income)}</td>
                    <td className="num">{brl(row.expense)}</td>
                    <td className="num">{brl(row.net)}</td>
                    <td className="num">
                      <Badge kind={row.balance >= 0 ? "paid" : "overdue"}>{brl(row.balance)}</Badge>
                    </td>
                    <td className="cell-actions">
                      <button
                        className="btn btn-outline btn-sm"
                        type="button"
                        onClick={() => setOpenMonth(openMonth === row.yearMonth ? null : row.yearMonth)}
                      >
                        {openMonth === row.yearMonth ? "Fechar" : "Ver lançamentos"}
                      </button>
                    </td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
          {openMonth ? (
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem" }}>Lançamentos de {monthLabel(openMonth)}</h4>
              <MonthLines branch={branch} yearMonth={openMonth} />
            </div>
          ) : null}
        </article>

        <article className="card" style={{ marginTop: "1rem" }}>
          <h3 style={{ marginTop: 0 }}>De onde veio e para onde foi</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Tipo de movimentação</th>
                  <th className="num">Lançamentos</th>
                  <th className="num">Valor</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={4} emptyMessage="Nenhum lançamento deste ramo.">
                {sources.map((source, index) => (
                  <AnimatedRow key={`${source.kind}-${source.movementTypeId ?? "caixinha"}`} index={index}>
                    <td>
                      <Badge kind={KIND_BADGES[source.kind]}>{KIND_LABELS[source.kind]}</Badge>
                    </td>
                    <td>
                      <strong>{source.name}</strong>
                    </td>
                    <td className="num">{source.count}</td>
                    <td className="num">{source.kind === "saida" ? `− ${brl(source.amount)}` : brl(source.amount)}</td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
          </div>
        </article>

        <MoneyMapCard />
      </div>
    </FetchOverlay>
  );
}
