import { useNavigate } from "react-router-dom";
import type { MemberProfile } from "@/domain";
import Modal from "@/shared/ui/Modal";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, formatDate, MONTHS, roleLabel } from "@/shared/lib/format";
import { paysMensalidade } from "@/domain";

const YOUTH_GRADE_BRANCHES = new Set(["filhote", "lobinho", "escoteiro", "senior", "pioneiro"]);

/** Jovem de filhote a pioneiro (Flor de Lis fica de fora): é quem tem mensalidade e aparece na grade. */
function isYouthMember(member: { role: string; branch: string }) {
  return member.role === "jovem" && YOUTH_GRADE_BRANCHES.has(member.branch) && paysMensalidade(member);
}

const CELL_LABEL: Record<string, string> = { paid: "pago", pending: "aberto", overdue: "venc.", none: "—" };

/** Tudo de um associado num lugar: situação, grade do ano, acordos e últimos lançamentos. */
export default function MemberProfileModal({ memberId, onClose }: { memberId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const profile = useFetch<MemberProfile>(`/members/${memberId}/profile`);
  const data = profile.data;
  const initials = data?.member.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <Modal title="Ficha do associado" onClose={onClose}>
      {profile.error ? (
        <p className="error">
          Não foi possível carregar a ficha. Tente de novo em instantes; se continuar, avise o admin.
        </p>
      ) : profile.loading || !data ? (
        <p className="muted">Carregando…</p>
      ) : (
        <div className="profile">
          <div className="profile__head">
            <span className="profile__avatar" aria-hidden>
              {initials}
            </span>
            <div>
              <h3>{data.member.name}</h3>
              <p className="muted">
                {roleLabel(data.member.role)} · {data.member.branchLabel} · desde {formatDate(data.member.joinedAt)}
                {data.guardians.length
                  ? ` · responsável: ${data.guardians.map((g) => `${g.name} (${g.relationship.toLowerCase()})`).join(", ")}`
                  : ""}
              </p>
            </div>
          </div>

          <div className="profile__kpis">
            <div className="profile__kpi">
              <span>Em aberto</span>
              <strong className={data.openAmount ? "is-neg" : "is-pos"}>{brl(data.openAmount)}</strong>
              <small className="muted">{data.open.length} mensalidade(s)</small>
            </div>
            <div className="profile__kpi">
              <span>Acordo de dívida</span>
              <strong>
                {data.arrears.length
                  ? data.arrears.map((plan) => `${plan.paidCount} de ${plan.totalCount}`).join(" · ")
                  : "nenhum"}
              </strong>
              <small className="muted">
                {data.arrears.length ? `saldo ${brl(data.arrears.reduce((s, plan) => s + plan.balance, 0))}` : "em dia"}
              </small>
            </div>
            <div className="profile__kpi">
              <span>Pago este ano</span>
              <strong className="is-pos">{brl(data.paidThisYear)}</strong>
              <small className="muted">entradas ligadas ao associado</small>
            </div>
          </div>

          {data.grade ? (
            <div className="profile__grade">
              <span className="muted">Mensalidades {data.grade.year}</span>
              <div className="profile__cells">
                {data.grade.cells.map((cell) => (
                  <div key={cell.month} className={`profile__cell is-${cell.status}`}>
                    <small>{MONTHS[cell.month - 1]?.slice(0, 3).toLowerCase()}</small>
                    {CELL_LABEL[cell.status] ?? cell.status}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.recent.length ? (
            <div>
              <span className="muted">Últimos lançamentos</span>
              <table className="table profile__recent">
                <tbody>
                  {data.recent.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.paidAt ?? tx.date)}</td>
                      <td>
                        {tx.description}
                        <div className="muted">{tx.movementTypeName}</div>
                      </td>
                      <td className="num">
                        {tx.paymentStatus === "pending" ? (
                          <span className="muted">pendente</span>
                        ) : (
                          <span className={tx.type === "income" ? "is-pos" : "is-neg"}>{brl(tx.amount)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}
      <div className="modal-actions">
        {data && isYouthMember(data.member) ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => navigate(`/mensalidades?busca=${encodeURIComponent(data.member.name)}`)}
          >
            Ver na grade
          </button>
        ) : null}
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
