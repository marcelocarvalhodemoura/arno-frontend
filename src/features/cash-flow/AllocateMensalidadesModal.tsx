import { useEffect, useMemo, useState } from "react";
import type { Member } from "@/domain";
import Modal from "@/shared/ui/Modal";
import SubmitButton from "@/shared/ui/SubmitButton";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import { api } from "@/core/http";
import { brl, MONTHS, todayISO } from "@/shared/lib/format";
import { useFetch } from "@/shared/hooks/use-fetch";
import type { MensalidadeReport } from "@/domain";

type AllocatePreview = {
  memberId: string;
  memberName: string;
  timing: "on_time" | "late";
  total: number;
  items: {
    yearMonth: string;
    year: number;
    month: number;
    dueDate: string;
    amount: number;
    onTimeAmount: number;
    lateAmount: number;
  }[];
};

type Props = {
  transactionId: string;
  creditAmount: number;
  creditPaidAt?: string | null;
  creditDescription: string;
  initialMemberId?: string;
  members: Member[];
  onClose: () => void;
  onDone: (message: string) => void;
};

export default function AllocateMensalidadesModal({
  transactionId,
  creditAmount,
  creditPaidAt,
  creditDescription,
  initialMemberId = "",
  members,
  onClose,
  onDone,
}: Props) {
  const [memberId, setMemberId] = useState(initialMemberId);
  const [year, setYear] = useState(() => Number((creditPaidAt || todayISO()).slice(0, 4)) || new Date().getFullYear());
  const [timing, setTiming] = useState<"on_time" | "late">("late");
  const [paidAt, setPaidAt] = useState((creditPaidAt || todayISO()).slice(0, 10));
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<AllocatePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const report = useFetch<MensalidadeReport>(memberId ? `/mensalidades?year=${year}` : null);

  const openMonths = useMemo(() => {
    const row = report.data?.rows.find((item) => item.memberId === memberId);
    if (!row) return [];
    return row.cells
      .filter((cell) => cell.status === "pending" || cell.status === "overdue")
      .map((cell) => ({
        yearMonth: `${year}-${String(cell.month).padStart(2, "0")}`,
        month: cell.month,
        status: cell.status,
        onTimeAmount: cell.onTimeAmount,
        lateAmount: cell.lateAmount,
      }));
  }, [report.data, memberId, year]);

  useEffect(() => {
    setSelected([]);
    setPreview(null);
    setError(null);
  }, [memberId, year]);

  useEffect(() => {
    if (selected.length < 2 || !memberId) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await api<AllocatePreview>("/mensalidades/allocate-preview", {
          method: "POST",
          body: JSON.stringify({ memberId, timing, yearMonths: selected }),
        });
        if (!cancelled) {
          setPreview(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setError(err instanceof Error ? err.message : "Não foi possível calcular o rateio");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [memberId, timing, selected]);

  function toggleMonth(yearMonth: string, checked: boolean) {
    setSelected((current) => (checked ? [...current, yearMonth].sort() : current.filter((item) => item !== yearMonth)));
  }

  const total = preview?.total ?? 0;
  const matches = preview != null && Math.abs(total - creditAmount) < 0.02;

  async function confirm() {
    if (!memberId || selected.length < 2 || !matches) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ settled: number; amount: number }>("/mensalidades/allocate", {
        method: "POST",
        body: JSON.stringify({
          transactionId,
          memberId,
          timing,
          yearMonths: selected,
          paidAt: paidAt || null,
          notifyReceipt: true,
        }),
      });
      const label = timing === "on_time" ? "pontual" : "com atraso";
      onDone(`${result.settled} mensalidades baixadas como ${label} (${brl(result.amount)}) a partir do Pix.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ratear as mensalidades");
    } finally {
      setBusy(false);
    }
  }

  const activeMembers = members.filter((item) => item.status === "active");

  return (
    <Modal title="Baixar mensalidades deste Pix" onClose={onClose}>
      <p className="muted">
        Crédito {brl(creditAmount)} · {creditDescription}. Escolha o associado, se o pagamento é pontual ou com atraso,
        e os meses (competência). A data do Pix fica só como data de pagamento.
      </p>
      {error ? <div className="error">{error}</div> : null}
      <label className="field">
        <span>Associado</span>
        <SearchableSelect
          required
          value={memberId}
          placeholder="Selecione…"
          searchPlaceholder="Buscar associado…"
          onChange={setMemberId}
          options={[
            { value: "", label: "Selecione…" },
            ...activeMembers.map((member) => ({ value: member.id, label: member.name })),
          ]}
        />
      </label>
      <div className="form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <label className="field">
          <span>Ano da grade</span>
          <input
            type="number"
            min={2020}
            max={2100}
            value={year}
            onChange={(e) => setYear(Number(e.target.value) || year)}
          />
        </label>
        <label className="field">
          <span>Data de pagamento (Pix)</span>
          <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
        </label>
      </div>
      <fieldset className="field wide" style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
        <legend className="muted" style={{ marginBottom: 8 }}>
          Valor de cada mês
        </legend>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <input
            type="radio"
            name="allocate-timing"
            checked={timing === "on_time"}
            onChange={() => setTiming("on_time")}
          />
          <span>Pontual</span>
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
          <input type="radio" name="allocate-timing" checked={timing === "late"} onChange={() => setTiming("late")} />
          <span>Com atraso</span>
        </label>
      </fieldset>
      <fieldset className="field wide" style={{ border: "none", padding: 0, margin: "12px 0 0" }}>
        <legend className="muted" style={{ marginBottom: 8 }}>
          Meses a baixar (marque 2 ou mais)
        </legend>
        {!memberId ? (
          <p className="muted">Selecione o associado.</p>
        ) : report.loading ? (
          <p className="muted">Carregando meses em aberto…</p>
        ) : openMonths.length === 0 ? (
          <p className="muted">Nenhuma mensalidade pendente ou vencida em {year}.</p>
        ) : (
          openMonths.map((item) => {
            const checked = selected.includes(item.yearMonth);
            const amount = timing === "late" ? item.lateAmount : item.onTimeAmount;
            return (
              <label key={item.yearMonth} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleMonth(item.yearMonth, e.target.checked)}
                />
                <span>
                  {MONTHS[item.month - 1]} {year} · {item.status === "overdue" ? "vencida" : "pendente"} · {brl(amount)}
                </span>
              </label>
            );
          })
        )}
      </fieldset>
      {selected.length >= 2 && preview ? (
        <p className={matches ? "muted" : "error"} style={{ marginTop: 12 }}>
          Soma das mensalidades: <strong>{brl(preview.total)}</strong>
          {" · "}
          Pix: <strong>{brl(creditAmount)}</strong>
          {matches ? " · ok" : " — os valores precisam ser iguais"}
        </p>
      ) : selected.length === 1 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Marque pelo menos mais um mês.
        </p>
      ) : null}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
          Cancelar
        </button>
        <SubmitButton
          type="button"
          busy={busy}
          busyLabel="Baixando…"
          disabled={!matches || selected.length < 2 || busy}
          onClick={() => void confirm()}
        >
          Confirmar rateio
        </SubmitButton>
      </div>
    </Modal>
  );
}
