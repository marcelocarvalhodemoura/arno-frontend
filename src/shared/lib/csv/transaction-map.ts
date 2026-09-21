import { fold } from "@/shared/lib/csv/fold";
import { pick } from "@/shared/lib/csv/parser";
import type { MapResult, TxImportRow } from "@/shared/lib/csv/types";
import { parseAmountCell, parseBranch, parseIsoDate, parseMethod, parseNature, parsePaymentStatus, parseTxType } from "@/shared/lib/csv/values";

export function mapTxRow(
  row: Record<string, string>,
  ctx: {
    movementTypes: { id: string; name: string; direction?: string; active?: boolean }[];
    members: { id: string; name: string }[];
  },
): MapResult<TxImportRow> {
  const date = parseIsoDate(pick(row, "data", "date", "vencimento"));
  const type = parseTxType(pick(row, "tipo", "type", "direcao"));
  const nature = parseNature(pick(row, "natureza", "nature"));
  const movementName = pick(row, "tipo_movimentacao", "tipo_de_movimentacao", "movimentacao", "movement_type");
  const description = pick(row, "descricao", "description", "historico");
  const amount = parseAmountCell(pick(row, "valor", "amount"));
  const branch = parseBranch(pick(row, "ramo", "branch"), true);
  const method = parseMethod(pick(row, "meio", "method", "forma")) ?? "pix";
  const paymentStatus = parsePaymentStatus(pick(row, "situacao", "status", "conciliação", "conciliacao"));
  const memberName = pick(row, "associado", "member", "nome");

  if (!date) return { ok: false, error: "Data inválida" };
  if (!type) return { ok: false, error: "Tipo deve ser entrada ou saída" };
  if (!nature) return { ok: false, error: "Natureza deve ser fixa ou variável" };
  if (description.length < 2) return { ok: false, error: "Descrição inválida" };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "Valor inválido" };
  if (!branch) return { ok: false, error: "Ramo inválido" };
  if (!paymentStatus) return { ok: false, error: "Situação inválida" };

  const movement = ctx.movementTypes.find((item) => fold(item.name) === fold(movementName) && item.active !== false);
  if (!movement) return { ok: false, error: "Tipo de movimentação não encontrado" };
  if (movement.direction && movement.direction !== "both" && movement.direction !== type) {
    return {
      ok: false,
      error: `O tipo ${movement.name} não aceita ${type === "income" ? "entrada" : "saída"}`,
    };
  }

  let memberId: string | undefined;
  if (memberName) {
    const member = ctx.members.find((item) => fold(item.name) === fold(memberName));
    if (!member) return { ok: false, error: "Associado não encontrado" };
    memberId = member.id;
  }

  return {
    ok: true,
    value: {
      date,
      type,
      nature,
      movementTypeId: movement.id,
      movementTypeName: movement.name,
      description,
      amount,
      branch,
      method,
      paymentStatus,
      memberId,
      memberName: memberName || undefined,
    },
  };
}
