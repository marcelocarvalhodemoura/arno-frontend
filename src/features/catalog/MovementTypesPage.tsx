import { useMemo, useState, type FormEvent } from "react";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  type BranchId,
  type MovementAudience,
  type MovementDirection,
  type MovementType,
} from "@/domain";
import RecordStamp from "@/shared/ui/RecordStamp";
import AudienceBadge from "@/shared/ui/AudienceBadge";
import PageHeader from "@/shared/ui/PageHeader";
import { PageGuide, movementTypesGuide } from "@/features/help";
import Modal from "@/shared/ui/Modal";
import { Badge } from "@/shared/ui/StatCard";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import SubmitButton from "@/shared/ui/SubmitButton";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import IconButton from "@/shared/ui/IconButton";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import { AnimatePresence } from "framer-motion";
import { FaBan, FaCheck, FaPen } from "react-icons/fa";
import { api } from "@/core/http";
import { useToast } from "@/shared/feedback/toast";
import { audienceLabel, directionLabel } from "@/shared/lib/format";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { formClass, submitAttempt } from "@/shared/lib/form";
import { useFetch } from "@/shared/hooks/use-fetch";
import { useFlashId } from "@/shared/hooks/use-flash-id";
import { AnimatedRow, AnimatedTableBody } from "@/shared/ui/AnimatedTable";

type TypeView = MovementType & {
  createdByUser?: { name: string; username?: string } | null;
  updatedByUser?: { name: string; username?: string } | null;
};

const AUDIENCE_OPTIONS: { value: MovementAudience; label: string }[] = [
  { value: "general", label: "Não se aplica" },
  { value: "internal", label: "Público interno (associados: acampamento, bivaque…)" },
  { value: "external", label: "Público externo (comunidade: festival, pastelada…)" },
];

const empty = {
  name: "",
  direction: "income" as MovementDirection,
  audience: "general" as MovementAudience,
  description: "",
  pixKey: "",
  branch: "grupo" as BranchId,
};

export default function MovementTypes() {
  const toast = useToast();
  const list = useFetch<TypeView[]>("/movement-types");
  const [flashId, flash] = useFlashId();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TypeView | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [directionFilter, setDirectionFilter] = useState<MovementDirection | "">("");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "">("");
  const [branchFilter, setBranchFilter] = useState<BranchId | "">("");
  const [audienceFilter, setAudienceFilter] = useState<MovementAudience | "">("");

  const types = list.data ?? [];
  const filtered = useMemo(
    () =>
      types.filter((type) => {
        if (directionFilter && type.direction !== directionFilter) return false;
        if (statusFilter === "active" && !type.active) return false;
        if (statusFilter === "inactive" && type.active) return false;
        if (branchFilter && (type.branch ?? "grupo") !== branchFilter) return false;
        if (audienceFilter && (type.audience ?? "general") !== audienceFilter) return false;
        return matchesQuery(query, [
          type.name,
          type.description,
          type.pixKey,
          directionLabel(type.direction),
          audienceLabel(type.audience),
          BRANCH_LABELS[type.branch ?? "grupo"],
        ]);
      }),
    [types, query, directionFilter, statusFilter, branchFilter, audienceFilter],
  );
  const listing = usePagedList(
    filtered,
    [query, directionFilter, statusFilter, branchFilter, audienceFilter].join("|"),
  );

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function openEdit(type: TypeView) {
    setEditing(type);
    setForm({
      name: type.name,
      direction: type.direction,
      audience: type.audience ?? "general",
      description: type.description,
      pixKey: type.pixKey ?? "",
      branch: type.branch ?? "grupo",
    });
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setForm(empty);
    setError(null);
    setAttempted(false);
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    if (!submitAttempt(e, setAttempted)) return;
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await api(`/movement-types/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        flash(editing.id);
        toast.success("Tipo de movimentação alterado com sucesso.");
      } else {
        const created = await api<{ id: string }>("/movement-types", {
          method: "POST",
          body: JSON.stringify(form),
        });
        flash(created.id);
        toast.success("Tipo de movimentação cadastrado com sucesso.");
      }
      closeForm();
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o tipo");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(type: TypeView) {
    await api(`/movement-types/${type.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !type.active }),
    });
    await list.reload();
    flash(type.id);
    toast.success("Tipo de movimentação alterado com sucesso.");
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando tipos de movimentação…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Cadastros"
        title="Tipos de movimentação"
        subtitle="Mensalidade, sede, doação e os demais tipos usados em cada lançamento. O ramo diz se o tipo é do grupo inteiro ou de uma seção."
        actions={
          <div className="page-head__actions">
            <PageGuide guide={movementTypesGuide} />
            <button className="btn btn-primary" type="button" onClick={openCreate}>
              Novo tipo
            </button>
          </div>
        }
      />

      <FetchOverlay active={list.loading} label="Atualizando tipos…">
        <article className="card">
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome ou descrição…" />
            </label>
            <label className="field">
              <span>Direção</span>
              <SearchableSelect
                value={directionFilter}
                onChange={(value) => setDirectionFilter(value as MovementDirection | "")}
                placeholder="Todas"
                options={[
                  { value: "", label: "Todas" },
                  { value: "income", label: "Somente entrada" },
                  { value: "expense", label: "Somente saída" },
                  { value: "both", label: "Entrada e saída" },
                ]}
              />
            </label>
            <label className="field">
              <span>Ramo</span>
              <SearchableSelect
                value={branchFilter}
                onChange={(value) => setBranchFilter(value as BranchId | "")}
                placeholder="Todos"
                options={[
                  { value: "", label: "Todos" },
                  ...ALL_BRANCHES.map((id) => ({ value: id, label: BRANCH_LABELS[id] })),
                ]}
              />
            </label>
            <label className="field">
              <span>Público</span>
              <SearchableSelect
                value={audienceFilter}
                onChange={(value) => setAudienceFilter(value as MovementAudience | "")}
                placeholder="Todos"
                options={[
                  { value: "", label: "Todos" },
                  { value: "internal", label: "Público interno" },
                  { value: "external", label: "Público externo" },
                  { value: "general", label: "Não se aplica" },
                ]}
              />
            </label>
            <label className="field">
              <span>Situação</span>
              <SearchableSelect
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as "active" | "inactive" | "")}
                placeholder="Todas"
                options={[
                  { value: "", label: "Todas" },
                  { value: "active", label: "Ativo" },
                  { value: "inactive", label: "Inativo" },
                ]}
              />
            </label>
          </FilterBar>
          <ListingResults fetching={list.loading} fetchLabel="Atualizando tipos…">
            <table className="data">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Ramo</th>
                  <th>Pix</th>
                  <th>Direção</th>
                  <th>Público</th>
                  <th>Situação</th>
                  <th className="cell-actions">Ações</th>
                </tr>
              </thead>
              <AnimatedTableBody emptyColSpan={7} emptyMessage="Nenhum tipo com esses filtros.">
                {listing.pageRows.map((type, index) => (
                  <AnimatedRow key={type.id} index={index} flash={flashId === type.id}>
                    <td>
                      <strong>{type.name}</strong>
                      <div className="muted">{type.description || "—"}</div>
                      <RecordStamp
                        origin={type.origin}
                        createdAt={type.createdAt}
                        createdBy={type.createdByUser}
                        updatedAt={type.updatedAt}
                        updatedBy={type.updatedByUser}
                      />
                    </td>
                    <td>{BRANCH_LABELS[type.branch ?? "grupo"]}</td>
                    <td>{type.pixKey || "—"}</td>
                    <td>
                      <Badge kind={type.direction === "expense" ? "expense" : "income"}>
                        {directionLabel(type.direction)}
                      </Badge>
                    </td>
                    <td>
                      <AudienceBadge audience={type.audience} />
                    </td>
                    <td>
                      <Badge kind={type.active ? "paid" : "inactive"}>{type.active ? "Ativo" : "Inativo"}</Badge>
                    </td>
                    <td className="cell-actions">
                      <IconButton label="Alterar tipo" onClick={() => openEdit(type)}>
                        <FaPen />
                      </IconButton>
                      <IconButton
                        label={type.active ? "Desativar tipo" : "Reativar tipo"}
                        tone={type.active ? "danger" : "success"}
                        onClick={() => void toggle(type)}
                      >
                        {type.active ? <FaBan /> : <FaCheck />}
                      </IconButton>
                    </td>
                  </AnimatedRow>
                ))}
              </AnimatedTableBody>
            </table>
            <Pager
              total={listing.total}
              fromRow={listing.fromRow}
              toRow={listing.toRow}
              pageSize={listing.pageSize}
              currentPage={listing.currentPage}
              pageCount={listing.pageCount}
              onPageSize={listing.setPageSize}
              onPage={listing.setPage}
            />
          </ListingResults>
        </article>
      </FetchOverlay>

      <AnimatePresence>
        {open ? (
          <Modal title={editing ? "Alterar tipo de movimentação" : "Novo tipo de movimentação"} onClose={closeForm}>
            <form onSubmit={save} className={formClass("form-grid", attempted)} noValidate>
              {error ? <div className="error wide">{error}</div> : null}
              <label className="field wide">
                <span>Nome</span>
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Direção</span>
                <SearchableSelect
                  required
                  value={form.direction}
                  placeholder="Selecione"
                  onChange={(value) => setForm({ ...form, direction: value as MovementDirection })}
                  options={[
                    { value: "income", label: "Somente entrada" },
                    { value: "expense", label: "Somente saída" },
                    { value: "both", label: "Entrada e saída" },
                  ]}
                />
              </label>
              <label className="field">
                <span>Ramo</span>
                <SearchableSelect
                  required
                  value={form.branch}
                  placeholder="Selecione"
                  onChange={(value) => setForm({ ...form, branch: value as BranchId })}
                  options={ALL_BRANCHES.map((id) => ({
                    value: id,
                    label: id === "grupo" ? "Grupo (todos os ramos)" : BRANCH_LABELS[id],
                  }))}
                />
              </label>
              <label className="field">
                <span>Público</span>
                <SearchableSelect
                  required
                  value={form.audience}
                  placeholder="Selecione"
                  onChange={(value) => setForm({ ...form, audience: value as MovementAudience })}
                  options={AUDIENCE_OPTIONS}
                />
                <small className="muted">
                  {form.audience === "internal"
                    ? "Entradas pedem o associado que pagou; o relatório lista os pagantes."
                    : form.audience === "external"
                      ? "Vendas para a comunidade, sem associado; o relatório mostra o resultado do evento."
                      : "Sem regra de associado."}
                </small>
              </label>
              <label className="field">
                <span>Chave Pix</span>
                <input
                  value={form.pixKey}
                  onChange={(e) => setForm({ ...form, pixKey: e.target.value })}
                  placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                />
              </label>
              <label className="field wide">
                <span>Descrição</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <div className="modal-actions wide">
                <button className="btn btn-ghost" type="button" onClick={closeForm} disabled={saving}>
                  Cancelar
                </button>
                <SubmitButton busy={saving} busyLabel="Salvando…">
                  {editing ? "Salvar alteração" : "Salvar"}
                </SubmitButton>
              </div>
            </form>
          </Modal>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
