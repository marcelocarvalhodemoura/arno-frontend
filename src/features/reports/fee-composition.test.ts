import { describe, expect, it } from "vitest";
import type { PaidFeeComposition } from "@/domain";
import { compositionRows } from "./fee-composition";
import { feeCompositionCsv } from "./report-csv";

function totals(partial: Partial<PaidFeeComposition["totals"]> = {}): PaidFeeComposition["totals"] {
  return {
    received: 0,
    groupCash: 0,
    group: 0,
    branch: 0,
    snack: 0,
    club: 0,
    dilution: 0,
    lateFee: 0,
    arrears: 0,
    difference: 0,
    count: 0,
    ...partial,
  };
}

const data: PaidFeeComposition = {
  total: 219,
  totals: totals({ received: 179, groupCash: 95, group: 86, dilution: 9, branch: 16, snack: 48, club: 20, count: 2 }),
  unlinked: { count: 1, amount: 40 },
  byBranch: [
    { memberBranch: "escoteiro", ...totals({ branch: 8 }) },
    { memberBranch: "lobinho", ...totals({ branch: 8 }) },
  ],
};

describe("compositionRows", () => {
  it("lists each destination with its parts and the destinations add up to the total received", () => {
    const rows = compositionRows(data);
    expect(rows.map((row) => [row.kind, row.label, row.amount])).toEqual([
      ["destination", "Caixa do grupo", 95],
      ["part", "Operacional", 86],
      ["part", "Diluição dez/jan/fev", 9],
      ["destination", "Caixinhas dos ramos", 16],
      ["part", "Escoteiro", 8],
      ["part", "Lobinho", 8],
      ["destination", "Fundo do lanche", 48],
      ["destination", "Taxa do clube", 20],
      ["destination", "Sem divisão (1 sem associado)", 40],
      ["total", "Mensalidades recebidas", 219],
    ]);
    const destinations = rows.filter((row) => row.kind === "destination").reduce((sum, row) => sum + row.amount, 0);
    expect(destinations).toBe(data.total);
  });

  it("shows a difference from the table as its own line to check", () => {
    const rows = compositionRows({ ...data, totals: { ...data.totals, difference: -9.5 } });
    expect(rows.find((row) => row.label.startsWith("Recebido a menos"))).toMatchObject({
      amount: -9.5,
      note: "A conferir",
    });
  });

  it("exports a titled CSV block and nothing without mensalidades", () => {
    expect(feeCompositionCsv(data).split("\n")[0]).toBe('"Composição das mensalidades recebidas"');
    expect(feeCompositionCsv(null)).toBe("");
  });
});
