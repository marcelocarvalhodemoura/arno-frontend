import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence } from "framer-motion";
import { FaPen, FaTrashAlt } from "react-icons/fa";
import {
  baseOf,
  compositionTotals,
  hasRole,
  periodCovers,
  periodRangeLabel,
  setActiveFeeSchedule,
  yearMonthOf,
  type FeeComposition,
  type FeeProfileKey,
  type FeeSchedule,
  type FeeSchedulePeriod,
} from "@/domain";
import { api } from "@/core/http";
import { useAuth } from "@/features/auth";
import { PageGuide, feeScheduleGuide } from "@/features/help";
import { useToast } from "@/shared/feedback/toast";
import { useFetch } from "@/shared/hooks/use-fetch";
import { formClass, submitAttempt } from "@/shared/lib/form";
import { brl } from "@/shared/lib/format";
import { formatMoney, maskMoney, parseMoney } from "@/shared/lib/masks";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import IconButton from "@/shared/ui/IconButton";
import Modal from "@/shared/ui/Modal";
import PageHeader from "@/shared/ui/PageHeader";
import PageLoader from "@/shared/ui/PageLoader";
import SubmitButton from "@/shared/ui/SubmitButton";

const PROFILES: { key: FeeProfileKey; label: string; hint: string }[] = [
  { key: "regular", label: "Demais ramos", hint: "Filhotes, lobinho, escoteiro e sênior" },
  { key: "pioneer", label: "Pioneiro", hint: "Ramo pioneiro" },
  { key: "familyNonMember", label: "Irmãos / filho de chefe", hint: "Valor fixo · não sócio do Lindóia" },
  { key: "familyMember", label: "Irmãos / filho de chefe (sócio)", hint: "Valor fixo · sócio do Lindóia" },
];

const PARTS: { key: Exclude<keyof FeeComposition, "pendingSplit">; label: string; family: boolean }[] = [
  { key: "group", label: "Operacional (grupo)", family: true },
  { key: "branch", label: "Caixinha do ramo", family: true },
  { key: "snack", label: "Lanche", family: true },
  { key: "clubOnTime", label: "Clube no prazo", family: true },
  { key: "clubLate", label: "Clube após venc.", family: false },
  { key: "dilution", label: "Diluição dez/jan/fev", family: true },
  { key: "lateFee", label: "Acréscimo por atraso", family: false },
];

function isFamily(key: FeeProfileKey) {
  return key === "familyNonMember" || key === "familyMember";
}

type PartsForm = Record<Exclude<keyof FeeComposition, "pendingSplit">, string> & { pendingSplit: boolean };

type PeriodForm = {
  startMonth: string;
  endMonth: string;
  note: string;
  hasFamily: boolean;
  profiles: Record<FeeProfileKey, PartsForm>;
};

function toPartsForm(parts: FeeComposition | null): PartsForm {
  const value = (n: number | undefined) => (parts && n ? formatMoney(n) : "");
  return {
    group: value(parts?.group),
    branch: value(parts?.branch),
    snack: value(parts?.snack),
    clubOnTime: value(parts?.clubOnTime),
    clubLate: value(parts?.clubLate),
    dilution: value(parts?.dilution),
    lateFee: value(parts?.lateFee),
    pendingSplit: Boolean(parts?.pendingSplit),
  };
}

function toComposition(form: PartsForm, family: boolean): FeeComposition {
  const read = (value: string) => {
    const n = parseMoney(value);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    group: read(form.group),
    branch: read(form.branch),
    snack: read(form.snack),
    clubOnTime: read(form.clubOnTime),
    clubLate: family ? 0 : read(form.clubLate),
    dilution: read(form.dilution),
    lateFee: family ? 0 : read(form.lateFee),
    pendingSplit: form.pendingSplit,
  };
}

function formFrom(period: FeeSchedulePeriod | null, fallback: FeeSchedulePeriod | undefined): PeriodForm {
  const source = period ?? fallback ?? null;
  return {
    startMonth: period?.startMonth ?? "",
    endMonth: period?.endMonth ?? "",
    note: period?.note ?? "",
    hasFamily: Boolean(source?.familyNonMember),
    profiles: {
      regular: toPartsForm(source?.regular ?? null),
      pioneer: toPartsForm(source?.pioneer ?? null),
      familyNonMember: toPartsForm(source?.familyNonMember ?? null),
      familyMember: toPartsForm(source?.familyMember ?? null),
    },
  };
}

function TotalsCell({ parts, family }: { parts: FeeComposition; family: boolean }) {
  const totals = compositionTotals(parts, family);
  if (family) return <strong>{brl(totals.onTime)}</strong>;
  return (
    <>
      <strong>{brl(totals.onTime)}</strong>
      <small className="muted fee-schedule__sub">
        após venc. {brl(totals.late)}
        {parts.clubOnTime || parts.dilution ? ` · sócio ${brl(totals.base)}` : ""}
      </small>
    </>
  );
}

function PeriodCard({
  period,
  current,
  canEdit,
  onEdit,
  onRemove,
}: {
  period: FeeSchedulePeriod;
  current: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <article className={`card fee-schedule__period${current ? " is-current" : ""}`}>
      <header className="fee-schedule__head">
        <div>
          <h3>
            {periodRangeLabel(period)} {current ? <span className="badge badge-paid">Vigente</span> : null}
          </h3>
          {period.note ? <p className="muted">{period.note}</p> : null}
        </div>
        {canEdit ? (
          <div className="cell-actions">
            <IconButton label="Alterar período" onClick={onEdit}>
              <FaPen />
            </IconButton>
            <IconButton label="Excluir período" tone="danger" onClick={onRemove}>
              <FaTrashAlt />
            </IconButton>
          </div>
        ) : null}
      </header>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Perfil</th>
              {PARTS.map((part) => (
                <th key={part.key} className="num">
                  {part.label}
                </th>
              ))}
              <th className="num">Total no prazo</th>
            </tr>
          </thead>
          <tbody>
            {PROFILES.map((profile) => {
              const parts = period[profile.key];
              const family = isFamily(profile.key);
              return (
                <tr key={profile.key}>
                  <td>
                    <strong>{profile.label}</strong>
                    <small className="muted fee-schedule__sub">{profile.hint}</small>
                    {parts?.pendingSplit ? <span className="badge badge-pending">Divisão a confirmar</span> : null}
                  </td>
                  {parts ? (
                    <>
                      {PARTS.map((part) => (
                        <td key={part.key} className="num">
                          {family && !part.family ? "—" : parts[part.key] ? brl(parts[part.key]) : "—"}
                        </td>
                      ))}
                      <td className="num">
                        <TotalsCell parts={parts} family={family} />
                      </td>
                    </>
                  ) : (
                    <td colSpan={PARTS.length + 1} className="muted">
                      Sem valor especial — paga a tabela do ramo.
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function ProfileFields({
  profileKey,
  value,
  attempted,
  onChange,
}: {
  profileKey: FeeProfileKey;
  value: PartsForm;
  attempted: boolean;
  onChange: (next: PartsForm) => void;
}) {
  const profile = PROFILES.find((item) => item.key === profileKey)!;
  const family = isFamily(profileKey);
  const parts = toComposition(value, family);
  const invalid = attempted && !(family ? compositionTotals(parts, true).onTime > 0 : baseOf(parts) > 0);
  return (
    <fieldset className={`fee-schedule__profile wide${invalid ? " is-invalid" : ""}`}>
      <legend>
        {profile.label} <small className="muted">· {profile.hint}</small>
      </legend>
      <div className="fee-schedule__parts">
        {PARTS.filter((part) => !family || part.family).map((part) => (
          <label key={part.key} className="field">
            <span>{part.label}</span>
            <input
              inputMode="decimal"
              placeholder="0,00"
              value={value[part.key]}
              onChange={(e) => onChange({ ...value, [part.key]: maskMoney(e.target.value) })}
            />
          </label>
        ))}
      </div>
      <div className="fee-schedule__total">
        <span>
          Total: <TotalsCell parts={parts} family={family} />
        </span>
        <label className="check-row">
          <input
            type="checkbox"
            checked={value.pendingSplit}
            onChange={(e) => onChange({ ...value, pendingSplit: e.target.checked })}
          />
          Divisão a confirmar
        </label>
      </div>
    </fieldset>
  );
}

export default function FeeSchedulePage() {
  const toast = useToast();
  const { role } = useAuth();
  const canEdit = hasRole(role, ["admin"]);
  const list = useFetch<FeeSchedule>("/fee-schedule");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeSchedulePeriod | null>(null);
  const [form, setForm] = useState<PeriodForm>(() => formFrom(null, undefined));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const periods = useMemo(
    () => [...(list.data ?? [])].sort((a, b) => b.startMonth.localeCompare(a.startMonth)),
    [list.data],
  );
  const currentId = useMemo(() => {
    const ym = yearMonthOf();
    return periods.find((period) => periodCovers(period, ym))?.id;
  }, [periods]);

  function openCreate() {
    setEditing(null);
    setForm(formFrom(null, periods.find((period) => period.id === currentId) ?? periods[0]));
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function openEdit(period: FeeSchedulePeriod) {
    setEditing(period);
    setForm(formFrom(period, undefined));
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setError(null);
    setAttempted(false);
  }

  function apply(schedule: FeeSchedule) {
    setActiveFeeSchedule(schedule);
    void list.reload();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    const body = {
      startMonth: form.startMonth,
      endMonth: form.endMonth || null,
      note: form.note,
      regular: toComposition(form.profiles.regular, false),
      pioneer: toComposition(form.profiles.pioneer, false),
      familyNonMember: form.hasFamily ? toComposition(form.profiles.familyNonMember, true) : null,
      familyMember: form.hasFamily ? toComposition(form.profiles.familyMember, true) : null,
    };
    setSaving(true);
    try {
      const schedule = await api<FeeSchedule>(editing ? `/fee-schedule/${editing.id}` : "/fee-schedule", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      apply(schedule);
      toast.success(
        editing
          ? "Período alterado. Cobranças em aberto recalculadas."
          : "Período criado. Cobranças em aberto recalculadas.",
      );
      closeForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o período");
    } finally {
      setSaving(false);
    }
  }

  async function remove(period: FeeSchedulePeriod) {
    if (
      !confirm(
        `Excluir o período “${periodRangeLabel(period)}”? As cobranças em aberto desses meses passam a seguir o período anterior.`,
      )
    ) {
      return;
    }
    try {
      apply(await api<FeeSchedule>(`/fee-schedule/${period.id}`, { method: "DELETE" }));
      toast.success("Período excluído. Cobranças em aberto recalculadas.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível excluir o período");
    }
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando composição…" />;
  }

  const setProfile = (key: FeeProfileKey) => (next: PartsForm) =>
    setForm((current) => ({ ...current, profiles: { ...current.profiles, [key]: next } }));

  return (
    <div>
      <PageHeader
        kicker="Cadastros"
        title="Composição da mensalidade"
        subtitle="Quanto de cada mensalidade vai para o grupo, a caixinha do ramo, o lanche e o clube — por período de vigência."
        actions={
          <div className="page-head__actions">
            <PageGuide guide={feeScheduleGuide} />
            {canEdit ? (
              <button className="btn btn-primary" type="button" onClick={openCreate}>
                Novo período
              </button>
            ) : null}
          </div>
        }
      />

      <FetchOverlay active={list.loading} label="Atualizando composição…">
        <div className="fee-schedule">
          {periods.map((period) => (
            <PeriodCard
              key={period.id}
              period={period}
              current={period.id === currentId}
              canEdit={canEdit}
              onEdit={() => openEdit(period)}
              onRemove={() => void remove(period)}
            />
          ))}
        </div>
      </FetchOverlay>

      <AnimatePresence>
        {open ? (
          <Modal title={editing ? "Alterar período" : "Novo período"} onClose={closeForm}>
            <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
              {error ? <div className="error wide">{error}</div> : null}
              <label className="field">
                <span>Início</span>
                <input
                  type="month"
                  required
                  value={form.startMonth}
                  onChange={(e) => setForm({ ...form, startMonth: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Fim (vazio = sem data para acabar)</span>
                <input
                  type="month"
                  min={form.startMonth || undefined}
                  value={form.endMonth}
                  onChange={(e) => setForm({ ...form, endMonth: e.target.value })}
                />
              </label>
              <label className="field wide">
                <span>Observação</span>
                <input
                  value={form.note}
                  maxLength={200}
                  placeholder="Ex.: reajuste aprovado na AGE"
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </label>

              <ProfileFields
                profileKey="regular"
                value={form.profiles.regular}
                attempted={attempted}
                onChange={setProfile("regular")}
              />
              <ProfileFields
                profileKey="pioneer"
                value={form.profiles.pioneer}
                attempted={attempted}
                onChange={setProfile("pioneer")}
              />

              <label className="field wide check-row">
                <input
                  type="checkbox"
                  checked={form.hasFamily}
                  onChange={(e) => setForm({ ...form, hasFamily: e.target.checked })}
                />
                Valor especial para irmãos / filho de chefe neste período
              </label>
              {form.hasFamily ? (
                <>
                  <ProfileFields
                    profileKey="familyNonMember"
                    value={form.profiles.familyNonMember}
                    attempted={attempted}
                    onChange={setProfile("familyNonMember")}
                  />
                  <ProfileFields
                    profileKey="familyMember"
                    value={form.profiles.familyMember}
                    attempted={attempted}
                    onChange={setProfile("familyMember")}
                  />
                </>
              ) : (
                <p className="muted wide">
                  Sem valor especial: irmãos e filhos de chefe pagam a tabela do ramo nestes meses.
                </p>
              )}

              <p className="muted wide">
                Ao salvar, as cobranças em aberto dos meses afetados são recalculadas. Mensalidades já pagas não mudam.
              </p>
              <div className="modal-actions wide">
                <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>
                  Cancelar
                </button>
                <SubmitButton busy={saving} busyLabel="Salvando…">
                  {editing ? "Salvar alteração" : "Criar período"}
                </SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
