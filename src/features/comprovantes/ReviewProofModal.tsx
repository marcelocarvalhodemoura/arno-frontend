import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Member } from "@/domain";
import { api } from "@/core/http";
import { useFetch } from "@/shared/hooks/use-fetch";
import { brl, formatDate, MONTHS } from "@/shared/lib/format";
import Modal from "@/shared/ui/Modal";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import SubmitButton from "@/shared/ui/SubmitButton";
import AllocateMensalidadesModal from "@/features/cash-flow/AllocateMensalidadesModal";
import { KIND_LABEL, type Candidates, type OpenMensalidade, type Proof } from "@/features/comprovantes/types";

type Props = {
  proof: Proof;
  members: Member[];
  onClose: () => void;
  onDone: (message: string) => void;
};

function sameAmount(a: number, b: number) {
  return Math.abs(a - b) < 0.005;
}

/**
 * Conferência do comprovante: a tesouraria escolhe o crédito do extrato e a mensalidade que ele paga.
 * Pagamento de vários meses vai para o rateio (mesmo modal do fluxo de caixa).
 */
export default function ReviewProofModal({ proof, members, onClose, onDone }: Props) {
  const candidates = useFetch<Candidates>(`/comprovantes/${proof.id}/candidatos`);
  const [creditId, setCreditId] = useState(proof.creditId ?? "");
  const [memberId, setMemberId] = useState(proof.memberIds.length === 1 ? proof.memberIds[0]! : "");
  const [pendingId, setPendingId] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Remetente sem cadastro (ou associado trocado): mensalidades do associado escolhido.
  const chosenOpen = useFetch<OpenMensalidade[]>(
    memberId && !proof.memberIds.includes(memberId)
      ? `/mensalidades/open?memberId=${encodeURIComponent(memberId)}`
      : null,
  );

  const credits = useMemo(() => {
    const list = candidates.data?.credits ?? [];
    // O crédito já ligado pelo id do Pix pode não estar entre os "a identificar" com o mesmo valor.
    if (proof.credit && !list.some((item) => item.id === proof.credit!.id)) return [proof.credit, ...list];
    return list;
  }, [candidates.data, proof.credit]);

  const open = useMemo(() => {
    const fromPhone = (candidates.data?.open ?? []).filter((item) => !memberId || item.memberId === memberId);
    if (memberId && !proof.memberIds.includes(memberId)) {
      const name = members.find((item) => item.id === memberId)?.name;
      return (chosenOpen.data ?? []).map((item) => ({ ...item, memberId, memberName: name }));
    }
    return fromPhone;
  }, [candidates.data, chosenOpen.data, memberId, members, proof.memberIds]);

  const credit = credits.find((item) => item.id === creditId);

  useEffect(() => {
    if (!creditId && credits.length === 1) setCreditId(credits[0]!.id);
  }, [credits, creditId]);

  useEffect(() => {
    // Sugere a mensalidade mais antiga com o valor exato do crédito.
    const amount = credit?.amount ?? proof.amount;
    const match = open.find((item) => sameAmount(item.onTimeAmount, amount) || sameAmount(item.lateAmount, amount));
    setPendingId(match?.transactionId ?? "");
  }, [open, credit, proof.amount]);

  async function confirm() {
    if (!creditId || !pendingId) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/comprovantes/${proof.id}/confirmar`, {
        method: "POST",
        body: JSON.stringify({ creditId, pendingId }),
      });
      const item = open.find((row) => row.transactionId === pendingId);
      onDone(
        item
          ? `Mensalidade de ${MONTHS[item.month - 1] ?? item.month}/${item.year} de ${item.memberName ?? "associado"} baixada.`
          : "Comprovante conciliado.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível conciliar");
    } finally {
      setBusy(false);
    }
  }

  async function linkAfterAllocation(message: string) {
    setAllocating(false);
    try {
      await api(`/comprovantes/${proof.id}/confirmar`, { method: "POST", body: JSON.stringify({ creditId }) });
      onDone(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rateio feito, mas não foi possível ligar o comprovante");
    }
  }

  const activeMembers = members.filter((item) => item.status === "active");

  return (
    <>
      <Modal title="Conferir comprovante" onClose={onClose}>
        <dl className="proof-facts">
          <div>
            <dt>Valor</dt>
            <dd>
              <strong>{proof.amount ? brl(proof.amount) : "—"}</strong>
            </dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{proof.date ? formatDate(proof.date) : "—"}</dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>{KIND_LABEL[proof.kind] ?? proof.kind}</dd>
          </div>
          <div>
            <dt>Pagador</dt>
            <dd>{[proof.payerName, proof.payerDocument].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt>Recebedor</dt>
            <dd>{[proof.payeeName, proof.payeeDocument].filter(Boolean).join(" · ") || "—"}</dd>
          </div>
          {proof.e2e ? (
            <div>
              <dt>ID do Pix</dt>
              <dd className="proof-facts__mono">{proof.e2e}</dd>
            </div>
          ) : null}
        </dl>
        {proof.reason ? <p className="muted proof-reason">{proof.reason}</p> : null}
        {error ? <div className="error">{error}</div> : null}
        {candidates.error ? <div className="error">{candidates.error}</div> : null}

        <fieldset className="proof-choice">
          <legend>1. Crédito no extrato</legend>
          {candidates.loading && !candidates.data ? <p className="muted">Procurando créditos…</p> : null}
          {!candidates.loading && !credits.length ? (
            <p className="muted">
              Nenhum crédito "A identificar" com esse valor perto dessa data. Se o Pix ainda não caiu, sincronize o
              Sicredi ou aguarde: o comprovante é conciliado sozinho quando o crédito chegar.
            </p>
          ) : null}
          {credits.map((item) => (
            <label key={item.id} className="proof-option">
              <input
                type="radio"
                name="proof-credit"
                checked={creditId === item.id}
                onChange={() => setCreditId(item.id)}
              />
              <span>
                <strong>{brl(item.amount)}</strong> · {formatDate(item.date)}
                <small className="muted">{item.description}</small>
              </span>
            </label>
          ))}
        </fieldset>

        <fieldset className="proof-choice">
          <legend>2. Mensalidade paga</legend>
          <label className="field">
            <span>Associado</span>
            <SearchableSelect
              value={memberId}
              placeholder="Selecione…"
              searchPlaceholder="Buscar associado…"
              onChange={setMemberId}
              options={[
                { value: "", label: proof.memberIds.length > 1 ? "Todos do telefone" : "Selecione…" },
                ...activeMembers.map((member) => ({ value: member.id, label: member.name })),
              ]}
            />
          </label>
          {memberId || proof.memberIds.length ? (
            open.length ? (
              open.map((item) => {
                const amount = credit?.amount ?? proof.amount;
                const exact = sameAmount(item.onTimeAmount, amount) || sameAmount(item.lateAmount, amount);
                return (
                  <label key={item.transactionId} className={`proof-option${exact ? " is-exact" : ""}`}>
                    <input
                      type="radio"
                      name="proof-pending"
                      checked={pendingId === item.transactionId}
                      onChange={() => setPendingId(item.transactionId)}
                    />
                    <span>
                      <strong>
                        {MONTHS[item.month - 1] ?? item.month}/{item.year}
                      </strong>
                      {item.memberName ? ` · ${item.memberName}` : ""}
                      <small className="muted">
                        Pontual {brl(item.onTimeAmount)} · com atraso {brl(item.lateAmount)}
                        {exact ? " · valor igual ao do Pix" : ""}
                      </small>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="muted">Nenhuma mensalidade em aberto para esse associado.</p>
            )
          ) : (
            <p className="muted">Telefone sem cadastro: escolha o associado.</p>
          )}
        </fieldset>

        <div className="modal-actions proof-actions">
          <button
            className="btn btn-ghost"
            type="button"
            disabled={!creditId || !memberId}
            title={!memberId ? "Escolha o associado" : undefined}
            onClick={() => setAllocating(true)}
          >
            Pix de vários meses…
          </button>
          <SubmitButton type="button" busy={busy} disabled={!creditId || !pendingId} onClick={() => void confirm()}>
            Confirmar baixa
          </SubmitButton>
        </div>
      </Modal>

      <AnimatePresence>
        {allocating && credit ? (
          <AllocateMensalidadesModal
            transactionId={credit.id}
            creditAmount={credit.amount}
            creditPaidAt={credit.date}
            creditDescription={credit.description}
            initialMemberId={memberId}
            members={members}
            onClose={() => setAllocating(false)}
            onDone={(message) => void linkAfterAllocation(message)}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
