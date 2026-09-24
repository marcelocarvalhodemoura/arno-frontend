import { describe, expect, it } from "vitest";
import { buildCashFlowDisplayRows, splitGroupLabel } from "./split-display";

describe("splitGroupLabel", () => {
  it("strips automatic rateio suffix from part descriptions", () => {
    expect(
      splitGroupLabel([
        {
          description: "João · parte 1/2 · R$ 30,00 de R$ 60,00 · Depósito Fernanda Amazin",
          splitIndex: 1,
        },
        {
          description: "Bruno · parte 2/2 · R$ 30,00 de R$ 60,00 · Depósito Fernanda Amazin",
          splitIndex: 2,
        },
      ]),
    ).toBe("Depósito Fernanda Amazin");
  });
});

describe("buildCashFlowDisplayRows", () => {
  const source = [
    {
      id: "a",
      splitGroupId: "g1",
      splitTotal: 60,
      splitIndex: 1,
      splitCount: 2,
      amount: 30,
      type: "income" as const,
      date: "2026-09-02",
      description: "Ana · parte 1/2 · R$ 30,00 de R$ 60,00 · Pix Fernanda",
      memberName: "Ana",
    },
    {
      id: "b",
      splitGroupId: "g1",
      splitTotal: 60,
      splitIndex: 2,
      splitCount: 2,
      amount: 30,
      type: "income" as const,
      date: "2026-09-02",
      description: "Bruno · parte 2/2 · R$ 30,00 de R$ 60,00 · Pix Fernanda",
      memberName: "Bruno",
    },
    {
      id: "c",
      amount: 100,
      type: "income" as const,
      date: "2026-09-03",
      description: "Doação",
      memberName: null,
    },
  ];

  it("groups split parts into one accordion row with original total", () => {
    const rows = buildCashFlowDisplayRows(source, new Set(["a", "b", "c"]), false);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      kind: "split",
      groupId: "g1",
      total: 60,
      partCount: 2,
      forceExpand: false,
    });
    if (rows[0].kind === "split") {
      expect(rows[0].beneficiaries).toContain("Ana");
      expect(rows[0].beneficiaries).toContain("Bruno");
      expect(rows[0].partIds).toEqual(["a", "b"]);
    }
    expect(rows[1]).toEqual({ kind: "single", id: "c", txId: "c" });
  });

  it("includes the whole group when only one part matches and force-expands on search", () => {
    const rows = buildCashFlowDisplayRows(source, new Set(["b"]), true);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "split",
      forceExpand: true,
      partIds: ["a", "b"],
      total: 60,
    });
  });
});
