import { useState } from "react";
import PageHeader from "@/shared/ui/PageHeader";
import { PageGuide, auditGuide } from "@/features/help";
import PageLoader from "@/shared/ui/PageLoader";
import StatCard from "@/shared/ui/StatCard";
import { useFetch } from "@/shared/hooks/use-fetch";
import { formatDateTime } from "@/shared/lib/format";

type Overview = {
  days: number;
  totals: { pages: number; actions: number; logins: number; activeUsers: number; errors: number };
  users: {
    userId: string;
    name: string;
    username: string;
    role: string;
    pages: number;
    actions: number;
    logins: number;
    total: number;
    lastSeen: string | null;
  }[];
  screens: { path: string; label: string; count: number }[];
  actions: { label: string; count: number }[];
  daily: { day: string; pages: number; actions: number; logins: number }[];
  recent: { id: string; at: string; user: string; kind: string; label: string; status: number | null }[];
};

const PERIODS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
  { days: 365, label: "12 meses" },
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: "Super admin",
  admin: "Administrador",
  tesoureiro: "Tesoureiro",
};

function Bars({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="audit-bars">
      {rows.slice(0, 10).map((row) => (
        <div key={row.label} className="audit-bar">
          <span className="audit-bar__label">{row.label}</span>
          <span className="audit-bar__track" aria-hidden>
            <i style={{ width: `${(row.count / max) * 100}%` }} />
          </span>
          <span className="audit-bar__value">{row.count.toLocaleString("pt-BR")}</span>
        </div>
      ))}
    </div>
  );
}

/** Auditoria de uso para o super admin: quem usa, quanto, onde e o que faz. */
export default function AuditPage() {
  const [days, setDays] = useState(30);
  const overview = useFetch<Overview>(`/audit/overview?days=${days}`);
  const data = overview.data;
  const maxDay = Math.max(1, ...(data?.daily ?? []).map((row) => row.pages + row.actions));
  const maxUser = Math.max(1, ...(data?.users ?? []).map((row) => row.total));

  return (
    <div>
      <PageHeader
        kicker="Super admin"
        title="Auditoria de uso"
        subtitle="Quem usa o sistema, quanto, em quais telas e com quais ações. Leituras não entram; telas abertas, ações que gravam e entradas sim."
        actions={
          <div className="page-head__actions">
            <PageGuide guide={auditGuide} />
            <div className="audit-periods" role="group" aria-label="Período">
              {PERIODS.map((period) => (
                <button
                  key={period.days}
                  type="button"
                  className={`flag ${days === period.days ? "is-on" : ""}`}
                  onClick={() => setDays(period.days)}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {!data ? (
        overview.error ? (
          <p className="error">{overview.error}</p>
        ) : (
          <PageLoader label="Montando a auditoria…" />
        )
      ) : (
        <>
          <div className="grid-stats audit-kpis">
            <StatCard
              title="Usuários ativos"
              value={String(data.totals.activeUsers)}
              hint={`de ${data.users.length} cadastrados`}
            />
            <StatCard
              title="Telas abertas"
              value={data.totals.pages.toLocaleString("pt-BR")}
              hint={`nos últimos ${data.days} dias`}
            />
            <StatCard
              title="Ações que gravam"
              value={data.totals.actions.toLocaleString("pt-BR")}
              tone="pos"
              hint="Lançar, alterar, excluir, baixar…"
            />
            <StatCard
              title="Ações com erro"
              value={data.totals.errors.toLocaleString("pt-BR")}
              tone={data.totals.errors ? "neg" : undefined}
              hint={`${data.totals.logins} entrada(s) no sistema`}
            />
          </div>

          <article className="card" style={{ marginTop: 16 }}>
            <h3>Atividade por dia</h3>
            {data.daily.length === 0 ? (
              <p className="muted">Sem atividade registrada no período.</p>
            ) : (
              <>
                <div className="audit-days" role="img" aria-label="Telas abertas e ações por dia">
                  {data.daily.map((row) => (
                    <div
                      key={row.day}
                      className="audit-day"
                      title={`${row.day.split("-").reverse().join("/")}: ${row.pages} telas, ${row.actions} ações`}
                    >
                      <i className="is-actions" style={{ height: `${(row.actions / maxDay) * 100}%` }} />
                      <i className="is-pages" style={{ height: `${(row.pages / maxDay) * 100}%` }} />
                    </div>
                  ))}
                </div>
                <p className="muted audit-legend">
                  <i className="is-pages" /> telas abertas <i className="is-actions" /> ações que gravam ·{" "}
                  {data.daily[0]?.day.split("-").reverse().join("/")} a{" "}
                  {data.daily.at(-1)?.day.split("-").reverse().join("/")}
                </p>
              </>
            )}
          </article>

          <article className="card" style={{ marginTop: 16 }}>
            <h3>Interações por usuário</h3>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Perfil</th>
                    <th className="num">Telas</th>
                    <th className="num">Ações</th>
                    <th className="num">Entradas</th>
                    <th>Participação</th>
                    <th>Última atividade</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((row) => (
                    <tr key={row.userId}>
                      <td>
                        <strong>{row.name}</strong>
                        <div className="muted">@{row.username}</div>
                      </td>
                      <td>{ROLE_LABEL[row.role] ?? row.role}</td>
                      <td className="num">{row.pages.toLocaleString("pt-BR")}</td>
                      <td className="num">{row.actions.toLocaleString("pt-BR")}</td>
                      <td className="num">{row.logins.toLocaleString("pt-BR")}</td>
                      <td>
                        <span className="audit-bar__track" aria-hidden>
                          <i style={{ width: `${(row.total / maxUser) * 100}%` }} />
                        </span>
                      </td>
                      <td>{row.lastSeen ? formatDateTime(row.lastSeen) : <span className="muted">sem uso</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <div className="audit-cols">
            <article className="card">
              <h3>Telas mais usadas</h3>
              <Bars rows={data.screens} empty="Nenhuma tela aberta no período." />
            </article>
            <article className="card">
              <h3>Ações mais frequentes</h3>
              <Bars rows={data.actions} empty="Nenhuma ação que grava no período." />
            </article>
          </div>

          <article className="card" style={{ marginTop: 16 }}>
            <h3>Últimos eventos</h3>
            <ol className="audit-recent">
              {data.recent.map((event) => (
                <li key={event.id}>
                  <span className="muted">{formatDateTime(event.at)}</span>
                  <strong>{event.user}</strong>
                  <span>{event.label}</span>
                  {event.status && event.status >= 400 ? (
                    <span className="error-inline">erro {event.status}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </article>
        </>
      )}
    </div>
  );
}
