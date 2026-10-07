import { BRANCH_LABELS, type EventResultRow, type TypePayers } from "@/domain";
import { formatDate, toCsv } from "@/shared/lib/format";

/** Linha de título de um bloco do CSV, entre aspas como o resto. */
function titleLine(title: string): string {
  return `"${title.replaceAll('"', '""')}"`;
}

/**
 * Seções extras do relatório customizado, depois da tabela principal no mesmo arquivo:
 * resultado dos eventos externos e pagantes de cada tipo interno filtrado.
 */
export function reportSectionsCsv(events: EventResultRow[], payers: TypePayers[]): string[] {
  const blocks: string[] = [];
  if (events.length) {
    blocks.push(
      [
        titleLine("Resultado dos eventos (público externo)"),
        toCsv(
          events.map((row) => ({
            Evento: row.name,
            Arrecadado: row.income,
            Gasto: row.expense,
            Resultado: row.net,
            Lançamentos: row.count,
          })),
        ),
      ].join("\n"),
    );
  }
  for (const group of payers) {
    const rows: Record<string, string | number>[] = group.payers.map((payer) => ({
      Associado: payer.name,
      Ramo: BRANCH_LABELS[payer.branch],
      "Último pagamento": formatDate(payer.lastDate),
      Pagamentos: payer.count,
      "Valor pago": payer.amount,
    }));
    if (group.unlinked.count) {
      rows.push({
        Associado: "Sem associado vinculado",
        Ramo: "",
        "Último pagamento": "",
        Pagamentos: group.unlinked.count,
        "Valor pago": group.unlinked.amount,
      });
    }
    rows.push({
      Associado: "Total recebido",
      Ramo: "",
      "Último pagamento": "",
      Pagamentos: "",
      "Valor pago": group.total,
    });
    blocks.push([titleLine(`Associados pagantes · ${group.name}`), toCsv(rows)].join("\n"));
  }
  return blocks;
}

/** Junta a tabela principal e as seções extras, separadas por uma linha em branco. */
export function joinCsvBlocks(blocks: string[]): string {
  return blocks.filter(Boolean).join("\n\n");
}
