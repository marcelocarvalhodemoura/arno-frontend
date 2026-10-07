import { describe, expect, it } from "vitest";
import { joinCsvBlocks, reportSectionsCsv } from "./report-csv";

describe("reportSectionsCsv", () => {
  it("não gera blocos sem eventos nem pagantes", () => {
    expect(reportSectionsCsv([], [])).toEqual([]);
  });

  it("gera o bloco de eventos e um bloco de pagantes por tipo interno", () => {
    const blocks = reportSectionsCsv(
      [{ movementTypeId: "p", name: "Pastelada", income: 450, expense: 120, net: 330, count: 2 }],
      [
        {
          movementTypeId: "b",
          name: "Bivaque Distrital",
          payers: [{ memberId: "a", name: "ANA", branch: "escoteiro", amount: 80, count: 2, lastDate: "2026-08-09" }],
          total: 140,
          unlinked: { amount: 60, count: 1 },
        },
      ],
    );
    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.split("\n")).toEqual([
      '"Resultado dos eventos (público externo)"',
      "Evento;Arrecadado;Gasto;Resultado;Lançamentos",
      '"Pastelada";"450";"120";"330";"2"',
    ]);
    const payerLines = blocks[1]!.split("\n");
    expect(payerLines[0]).toBe('"Associados pagantes · Bivaque Distrital"');
    expect(payerLines[2]).toContain('"ANA"');
    expect(payerLines[3]).toBe('"Sem associado vinculado";"";"";"1";"60"');
    expect(payerLines[4]).toBe('"Total recebido";"";"";"";"140"');
  });
});

describe("joinCsvBlocks", () => {
  it("separa os blocos com linha em branco e ignora vazios", () => {
    expect(joinCsvBlocks(["a;b", "", "c"])).toBe("a;b\n\nc");
  });
});
