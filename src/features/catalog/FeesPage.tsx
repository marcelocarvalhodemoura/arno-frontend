import { useMemo, useState, type FormEvent } from "react";
import type { Fee } from "@/domain";
import RecordStamp from "@/shared/ui/RecordStamp";
import PageHeader from "@/shared/ui/PageHeader";
import Modal from "@/shared/ui/Modal";
import PageLoader from "@/shared/ui/PageLoader";
import FetchOverlay from "@/shared/ui/FetchOverlay";
import ListingResults from "@/shared/ui/ListingResults";
import SubmitButton from "@/shared/ui/SubmitButton";
import FilterBar from "@/shared/ui/FilterBar";
import Pager from "@/shared/ui/Pager";
import IconButton from "@/shared/ui/IconButton";
import { AnimatePresence } from "framer-motion";
import { FaPen, FaTrashAlt } from "react-icons/fa";
import { api } from "@/core/http";
import { useToast } from "@/shared/feedback/toast";
import { brl } from "@/shared/lib/format";
import { matchesQuery, usePagedList } from "@/shared/lib/listing";
import { formatMoney, maskMoney, parseMoney } from "@/shared/lib/masks";
import { formClass, submitAttempt } from "@/shared/lib/form";
import { useFetch } from "@/shared/hooks/use-fetch";

type FeeView = Fee & {
  createdByUser?: { name: string; username?: string } | null;
  updatedByUser?: { name: string; username?: string } | null;
};

const empty = { name: "", amount: "" };

export default function Fees() {
  const toast = useToast();
  const list = useFetch<FeeView[]>("/fees");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeeView | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [attempted, setAttempted] = useState(false);

  const fees = list.data ?? [];
  const filtered = useMemo(() => fees.filter((fee) => matchesQuery(query, [fee.name, brl(fee.amount)])), [fees, query]);
  const listing = usePagedList(filtered, query);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError(null);
    setAttempted(false);
    setOpen(true);
  }

  function openEdit(fee: FeeView) {
    setEditing(fee);
    setForm({ name: fee.name, amount: formatMoney(fee.amount) });
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
    const amount = parseMoney(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    try {
      if (editing) {
        await api(`/fees/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: form.name, amount }),
        });
        toast.success("Taxa alterada com sucesso.");
      } else {
        await api("/fees", {
          method: "POST",
          body: JSON.stringify({ name: form.name, amount }),
        });
        toast.success("Taxa cadastrada com sucesso.");
      }
      closeForm();
      await list.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a taxa");
    } finally {
      setSaving(false);
    }
  }

  async function remove(fee: FeeView) {
    if (!confirm(`Excluir a taxa “${fee.name}”?`)) return;
    await api(`/fees/${fee.id}`, { method: "DELETE" });
    toast.success("Taxa excluída com sucesso.");
    await list.reload();
  }

  if (!list.data) {
    if (list.error) return <p className="error">{list.error}</p>;
    return <PageLoader label="Carregando taxas…" />;
  }

  return (
    <div>
      <PageHeader
        kicker="Cadastros"
        title="Taxas"
        subtitle="Tabela oficial da mensalidade (base, extra de não sócio, pontualidade e atraso). Outras taxas do grupo continuam neste cadastro."
        actions={
          <button className="btn btn-primary" type="button" onClick={openCreate}>
            Nova taxa
          </button>
        }
      />

      <FetchOverlay active={list.loading} label="Atualizando taxas…">
        <article className="card">
          <FilterBar>
            <label className="field">
              <span>Buscar</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome ou valor…" />
            </label>
          </FilterBar>
          <ListingResults fetching={list.loading} filtering={listing.busy} fetchLabel="Atualizando taxas…">
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Taxa</th>
                    <th className="num">Valor</th>
                    <th className="cell-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">
                        Nenhuma taxa com esses filtros.
                      </td>
                    </tr>
                  ) : (
                    listing.pageRows.map((fee) => (
                      <tr key={fee.id}>
                        <td>
                          <strong>{fee.name}</strong>
                          <RecordStamp
                            origin={fee.origin}
                            createdAt={fee.createdAt}
                            createdBy={fee.createdByUser}
                            updatedAt={fee.updatedAt}
                            updatedBy={fee.updatedByUser}
                          />
                        </td>
                        <td className="num">{brl(fee.amount)}</td>
                        <td className="cell-actions">
                          <IconButton label="Alterar taxa" onClick={() => openEdit(fee)}>
                            <FaPen />
                          </IconButton>
                          <IconButton label="Excluir taxa" tone="danger" onClick={() => void remove(fee)}>
                            <FaTrashAlt />
                          </IconButton>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
          <Modal title={editing ? "Alterar taxa" : "Nova taxa"} onClose={closeForm}>
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
              <label className={`field${attempted && !(parseMoney(form.amount) > 0) ? " is-invalid" : ""}`}>
                <span>Valor</span>
                <input
                  required
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: maskMoney(e.target.value) })}
                  placeholder="0,00"
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
