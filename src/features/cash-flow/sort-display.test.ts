import { describe, expect, it } from "vitest";
import { sortCashFlowDisplayRows } from "./sort-display";
import type { CashFlowDisplayRow } from "./split-display";

const txById = new Map([
  [
    "a",
    {
      id: "a",
      date: "2026-09-10",
      paidAt: "2026-09-12",
      type: "expense" as const,
      nature: "variable" as const,
      movementTypeId: "m1",
      description: "Aluguel",
      amount: 200,
      branch: "grupo" as const,
      method: "pix" as const,
      paymentStatus: "pending" as const,
      createdAt: "2026-09-01",
      origin: "manual" as const,
      movementType: {
        id: "m1",
        name: "Aluguel",
        direction: "expense" as const,
        description: "",
        pixKey: "",
        branch: "grupo" as const,
        active: true,
        origin: "manual" as const,
        createdAt: "",
      },
    },
  ],
  [
    "b",
    {
      id: "b",
      date: "2026-09-01",
      paidAt: "2026-09-01",
      type: "income" as const,
      nature: "fixed" as const,
      movementTypeId: "m2",
      description: "Doação",
      amount: 50,
      branch: "escoteiro" as const,
      method: "pix" as const,
      paymentStatus: "paid" as const,
      createdAt: "2026-09-01",
      origin: "manual" as const,
      movementType: {
        id: "m2",
        name: "Doação",
        direction: "income" as const,
        description: "",
        pixKey: "",
        branch: "escoteiro" as const,
        active: true,
        origin: "manual" as const,
        createdAt: "",
      },
    },
  ],
]);

const rows: CashFlowDisplayRow[] = [
  { kind: "single", id: "a", txId: "a" },
  { kind: "single", id: "b", txId: "b" },
];

describe("sortCashFlowDisplayRows", () => {
  it("sorts by due date ascending", () => {
    const sorted = sortCashFlowDisplayRows(rows, txById as never, "dueDate", "asc");
    expect(sorted.map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("sorts by amount descending (signed)", () => {
    const sorted = sortCashFlowDisplayRows(rows, txById as never, "amount", "desc");
    expect(sorted.map((row) => row.id)).toEqual(["b", "a"]);
  });

  it("sorts by description", () => {
    const sorted = sortCashFlowDisplayRows(rows, txById as never, "description", "asc");
    expect(sorted.map((row) => row.id)).toEqual(["a", "b"]);
  });
});
