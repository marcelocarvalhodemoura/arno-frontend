import { useEffect, useMemo, useState } from "react";
import {
  ALL_BRANCHES,
  BRANCH_LABELS,
  type BranchId,
  type MovementType,
  type ReportGroupBy,
  type TxType,
} from "@/domain";
import { api } from "@/core/http";
import SearchableSelect from "@/shared/ui/SearchableSelect";
import { GROUP_BY_LABELS, periodPresets } from "./report-catalog";

export const BUILDER_GROUPS: ReportGroupBy[] = ["movementType", "month", "method", "member", "none"];

const DIRECTIONS: { label: string; types: TxType[] }[] = [
  { label: "Entradas e saídas", types: [] },
  { label: "Só entradas", types: ["income"] },
  { label: "Só saídas", types: ["expense"] },
];

type PresetId = "month" | "prev" | "ytd" | "s1" | "s2" | "lastYear";

/** Escolhas da tela gravadas no modelo (sem os dados do relatório). */
export type TemplateQuery = {
  period: { preset: PresetId } | { from: string; to: string };
  types: TxType[];
  groupBy: ReportGroupBy;
  branches: BranchId[];
  movementTypeIds: string[];
  memberIds: string[];
  showLedger: boolean;
};

export type ReportTemplate = {
  id: string;
  name: string;
  query: TemplateQuery;
  updatedAt: string | null;
  createdAt: string;
};

type MemberOption = { id: string; name: string; branch: BranchId };

export type BuilderState = {
  from: string;
  to: string;
  types: TxType[];
  groupBy: ReportGroupBy;
  branches: BranchId[];
  movementTypeIds: string[];
  memberIds: string[];
  showLedger: boolean;
};

type Props = BuilderState & {
  movementTypes: MovementType[];
  onChange: (patch: Partial<BuilderState>) => void;
  /** Avisa o nome do modelo aberto (vai no título do documento). */
  onTemplate: (name: string | null) => void;
};

function sameList<T>(a: T[], b: T[]) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

function toggled<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** Chave estável das escolhas (o banco reordena as chaves do JSON salvo). */
function queryKey(query: TemplateQuery) {
  const period = "preset" in query.period ? ["preset", query.period.preset] : [query.period.from, query.period.to];
  return JSON.stringify([
    period,
    [...query.types].sort(),
    query.groupBy,
    [...query.branches].sort(),
    [...query.movementTypeIds].sort(),
    [...query.memberIds].sort(),
    query.showLedger,
  ]);
}

/** Período do modelo: atalho (recalculado ao abrir) quando as datas batem com um, senão datas fixas. */
function periodOf(from: string, to: string): TemplateQuery["period"] {
  const preset = periodPresets().find((item) => item.from === from && item.to === to);
  return preset ? { preset: preset.id as PresetId } : { from, to };
}

function datesOf(period: TemplateQuery["period"]) {
  if ("preset" in period) {
    const preset = periodPresets().find((item) => item.id === period.preset);
    if (preset) return { from: preset.from, to: preset.to };
  }
  return "from" in period ? { from: period.from, to: period.to } : null;
}

/** Título do documento montado a partir das escolhas: "Saídas por tipo de movimentação · Lobinho". */
export function builderTitle(state: BuilderState, members: { id: string; name: string }[] = []) {
  const what = state.types.length === 1 ? (state.types[0] === "income" ? "Entradas" : "Saídas") : "Entradas e saídas";
  const by =
    state.groupBy === "none" ? "lançamento a lançamento" : `por ${GROUP_BY_LABELS[state.groupBy].toLowerCase()}`;
  const scope = [
    state.branches.map((id) => BRANCH_LABELS[id]).join(", "),
    state.memberIds.length === 1
      ? (members.find((item) => item.id === state.memberIds[0])?.name ?? "1 associado")
      : state.memberIds.length
        ? `${state.memberIds.length} associados`
        : "",
  ].filter(Boolean);
  return [`${what} ${by}`, ...scope].join(" · ");
}

export default function ReportBuilder(props: Props) {
  const { from, to, types, groupBy, branches, movementTypeIds, memberIds, showLedger, movementTypes, onChange } = props;
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [typeQuery, setTypeQuery] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    void api<MemberOption[]>("/members").then(setMembers);
    void api<ReportTemplate[]>("/report-templates").then(setTemplates);
  }, []);

  const current = templates.find((item) => item.id === templateId) ?? null;
  const query: TemplateQuery = {
    period: periodOf(from, to),
    types,
    groupBy,
    branches,
    movementTypeIds,
    memberIds,
    showLedger,
  };
  const changedFromTemplate = current ? queryKey(current.query) !== queryKey(query) : false;

  const visibleTypes = useMemo(() => {
    const term = typeQuery.trim().toLowerCase();
    return movementTypes.filter(
      (item) => movementTypeIds.includes(item.id) || !term || item.name.toLowerCase().includes(term),
    );
  }, [movementTypes, movementTypeIds, typeQuery]);

  function openTemplate(id: string) {
    setTemplateId(id);
    setMessage(null);
    const template = templates.find((item) => item.id === id);
    props.onTemplate(template?.name ?? null);
    if (!template) return;
    const dates = datesOf(template.query.period);
    onChange({
      ...(dates ?? {}),
      types: template.query.types,
      groupBy: template.query.groupBy,
      branches: template.query.branches,
      movementTypeIds: template.query.movementTypeIds,
      memberIds: template.query.memberIds,
      showLedger: template.query.showLedger,
    });
  }

  async function saveNew() {
    const name = saveName.trim();
    if (name.length < 2) {
      setMessage({ kind: "error", text: "Dê um nome ao modelo (ex.: Saídas do acampamento)." });
      return;
    }
    setSaving(true);
    try {
      const created = await api<ReportTemplate>("/report-templates", {
        method: "POST",
        body: JSON.stringify({ name, query }),
      });
      const list = await api<ReportTemplate[]>("/report-templates");
      setTemplates(list);
      setTemplateId(created.id);
      props.onTemplate(name);
      setSaveName("");
      setMessage({ kind: "ok", text: `Modelo “${name}” salvo.` });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Não foi possível salvar" });
    } finally {
      setSaving(false);
    }
  }

  async function overwrite() {
    if (!current) return;
    setSaving(true);
    try {
      await api(`/report-templates/${current.id}`, { method: "PATCH", body: JSON.stringify({ query }) });
      setTemplates(await api<ReportTemplate[]>("/report-templates"));
      setMessage({ kind: "ok", text: `Modelo “${current.name}” atualizado com as escolhas atuais.` });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Não foi possível atualizar" });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!current) return;
    setSaving(true);
    try {
      await api(`/report-templates/${current.id}`, { method: "DELETE" });
      setTemplates((list) => list.filter((item) => item.id !== current.id));
      setTemplateId("");
      props.onTemplate(null);
      setMessage({ kind: "ok", text: `Modelo “${current.name}” apagado.` });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Não foi possível apagar" });
    } finally {
      setSaving(false);
    }
  }

  const memberOptions = members
    .filter((item) => !memberIds.includes(item.id))
    .map((item) => ({ value: item.id, label: `${item.name} · ${BRANCH_LABELS[item.branch] ?? item.branch}` }));

  return (
    <div className="report-builder">
      <div className="report-builder__templates">
        <label className="field">
          <span>Modelos salvos</span>
          <select value={templateId} onChange={(event) => openTemplate(event.target.value)}>
            <option value="">{templates.length ? "Escolha um modelo…" : "Nenhum modelo salvo ainda"}</option>
            {templates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {current ? (
          <div className="report-builder__actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={saving || !changedFromTemplate}
              onClick={() => void overwrite()}
              title={
                changedFromTemplate
                  ? "Grava as escolhas atuais neste modelo"
                  : "Nada mudou desde que o modelo foi aberto"
              }
            >
              Atualizar modelo
            </button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={saving} onClick={() => void remove()}>
              Apagar modelo
            </button>
          </div>
        ) : null}
      </div>

      <ol className="report-builder__steps">
        <li>
          <strong>Período</strong>
          <span className="muted">
            Use os atalhos ou as datas acima. Salvo com um atalho (ex.: “Ano até hoje”), o modelo recalcula as datas ao
            ser aberto.
          </span>
        </li>
        <li>
          <strong>O que mostrar</strong>
          <div className="report-presets" role="group" aria-label="O que mostrar">
            {DIRECTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`flag ${sameList(types, option.types) ? "is-on" : ""}`}
                onClick={() => onChange({ types: option.types })}
              >
                {option.label}
              </button>
            ))}
          </div>
        </li>
        <li>
          <strong>Agrupar por</strong>
          <div className="report-presets" role="group" aria-label="Agrupar por">
            {BUILDER_GROUPS.map((option) => (
              <button
                key={option}
                type="button"
                className={`flag ${groupBy === option ? "is-on" : ""}`}
                onClick={() => onChange({ groupBy: option })}
              >
                {GROUP_BY_LABELS[option]}
              </button>
            ))}
          </div>
          <span className="muted">Para saber quanto cada ramo tem, use o Extrato dos ramos.</span>
        </li>
        <li>
          <strong>Filtrar</strong>
          <div className="form-grid">
            <div className="field wide">
              <span>Ramos {branches.length ? `(${branches.length})` : "· todos"}</span>
              <div className="check-row">
                {ALL_BRANCHES.map((id) => (
                  <label key={id}>
                    <input
                      type="checkbox"
                      checked={branches.includes(id)}
                      onChange={() => onChange({ branches: toggled(branches, id) })}
                    />
                    {BRANCH_LABELS[id]}
                  </label>
                ))}
              </div>
            </div>
            <div className="field wide">
              <span>Tipos de movimentação {movementTypeIds.length ? `(${movementTypeIds.length})` : "· todos"}</span>
              <input
                value={typeQuery}
                onChange={(event) => setTypeQuery(event.target.value)}
                placeholder="Buscar tipo (ex.: acampamento)…"
              />
              <div className="check-row">
                {visibleTypes.map((item) => (
                  <label key={item.id}>
                    <input
                      type="checkbox"
                      checked={movementTypeIds.includes(item.id)}
                      onChange={() => onChange({ movementTypeIds: toggled(movementTypeIds, item.id) })}
                    />
                    {item.name}
                  </label>
                ))}
              </div>
            </div>
            <div className="field wide">
              <span>Associados {memberIds.length ? `(${memberIds.length})` : "· todos"}</span>
              <SearchableSelect
                value=""
                onChange={(id) => id && onChange({ memberIds: [...memberIds, id] })}
                options={memberOptions}
                placeholder="Adicionar associado…"
                searchPlaceholder="Nome do associado"
              />
              {memberIds.length ? (
                <div className="report-builder__chips">
                  {memberIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="flag is-on"
                      onClick={() => onChange({ memberIds: memberIds.filter((item) => item !== id) })}
                      title="Tirar do filtro"
                    >
                      {members.find((item) => item.id === id)?.name ?? "Associado"} ✕
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </li>
        <li>
          <strong>Detalhe</strong>
          <label className="report-ledger-toggle">
            <input type="checkbox" checked={showLedger} onChange={(e) => onChange({ showLedger: e.target.checked })} />
            Incluir o livro-caixa (lançamento a lançamento, com saldo acumulado)
          </label>
        </li>
      </ol>

      <div className="report-builder__save">
        <label className="field">
          <span>Salvar estas escolhas como modelo</span>
          <input
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder="Nome do modelo (ex.: Saídas do acampamento)"
            maxLength={80}
          />
        </label>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => void saveNew()}>
          Salvar modelo
        </button>
      </div>
      {message ? <p className={message.kind === "error" ? "error" : "report-builder__ok"}>{message.text}</p> : null}
    </div>
  );
}
