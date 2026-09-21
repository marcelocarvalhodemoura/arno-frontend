import { useMemo, useState, type FormEvent } from "react";
import { ALL_BRANCHES, BRANCH_LABELS, type BranchId, type MovementDirection, type MovementType } from "@/domain";
import RecordStamp from "@/shared/ui/RecordStamp";
import PageHeader from "@/shared/ui/PageHeader";
import Modal from "@/shared/ui/Modal";
import { Badge } from "@/shared/ui/StatCard";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import SubmitButton from "@/shared/ui/SubmitButton";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import IconButton from "@/shared/ui/IconButton";
import { AnimatePresence } from "framer-motion";
import { FaBan, FaCheck, FaPen } from "react-icons/fa";
import { api } from "@/core/http";
import { useToast } from "@/shared/feedback/toast";
import { directionLabel } from "@/shared/lib/format";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { formClass, submitAttempt } from "@/shared/lib/form";
import { useFetch } from "@/shared/hooks/use-fetch";

type TypeView = MovementType & {
  createdByUser?: { name: string; username?: string } | null;
  updatedByUser?: { name: string; username?: string } | null;
};

const empty = {
  name: "",
  direction: "income" as MovementDirection,
  description: "",
  pixKey: "",
  branch: "grupo" as BranchId,
};

export default function MovementTypes() {
  const toast = useToast();
  const list = useFetch<TypeView[]>("/movement-types");
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

  const types = list.data ?? [];
  const filtered = useMemo(
    () =>
      types.filter((type) => {
        if (directionFilter && type.direction !== directionFilter) return false;
        if (statusFilter === "active" && !type.active) return false;
        if (statusFilter === "inactive" && type.active) return false;
        if (branchFilter && (type.branch ?? "grupo") !== branchFilter) return false;
        return matchesQuery(query, [
          type.name,
          type.description,
          type.pixKey,
          directionLabel(type.direction),
          BRANCH_LABELS[type.branch ?? "grupo"],
        ]);
      }),
    [types, query, directionFilter, statusFilter, branchFilter],
  );
  const listing = usePagedList(filtered, [query, directionFilter, statusFilter, branchFilter].join("|"));

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
        toast.success("Tipo de movimentação alterado com sucesso.");
      } else {
        await api("/movement-types", {
          method: "POST",
          body: JSON.stringify(form),
        });
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
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            Novo tipo
          </button>
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
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as MovementDirection | "")}
              >
                <option value="">Todas</option>
                <option value="income">Somente entrada</option>
                <option value="expense">Somente saída</option>
                <option value="both">Entrada e saída</option>
              </select>
            </label>
            <label className="field">
              <span>Ramo</span>
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value as BranchId | "")}>
                <option value="">Todos</option>
                {ALL_BRANCHES.map((id) => (
                  <option key={id} value={id}>
                    {BRANCH_LABELS[id]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Situação</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "active" | "inactive" | "")}
              >
                <option value="">Todas</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>
          </FilterBar>
          <ListingResults fetching={list.loading} filtering={listing.busy} fetchLabel="Atualizando tipos…">
            <table className="data">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Ramo</th>
                  <th>Pix</th>
                  <th>Direção</th>
                  <th>Situação</th>
                  <th className="cell-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {listing.pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      Nenhum tipo com esses filtros.
                    </td>
                  </tr>
                ) : (
                  listing.pageRows.map((type) => (
                    <tr key={type.id}>
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
                    </tr>
                  ))
                )}
              </tbody>
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
                <select
                  required
                  value={form.direction}
                  onChange={(e) => setForm({ ...form, direction: e.target.value as MovementDirection })}
                >
                  <option value="income">Somente entrada</option>
                  <option value="expense">Somente saída</option>
                  <option value="both">Entrada e saída</option>
                </select>
              </label>
              <label className="field">
                <span>Ramo</span>
                <select
                  required
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value as BranchId })}
                >
                  {ALL_BRANCHES.map((id) => (
                    <option key={id} value={id}>
                      {id === "grupo" ? "Grupo (todos os ramos)" : BRANCH_LABELS[id]}
                    </option>
                  ))}
                </select>
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
