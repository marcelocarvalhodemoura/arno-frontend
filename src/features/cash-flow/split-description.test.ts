import { describe, expect, it } from "vitest";
import { buildSplitPartDescription, formatSplitBeneficiaries } from "./split-description";

describe("buildSplitPartDescription", () => {
  it("includes part index and total for the second half", () => {
    expect(
      buildSplitPartDescription({
        baseDescription: "Depósito Fernanda Amazin",
        partIndex: 2,
        partCount: 2,
        partAmount: 30,
        totalAmount: 60,
      }),
    ).toBe("Depósito Fernanda Amazin · parte 2/2 · R$ 30,00 de R$ 60,00");
  });

  it("prefixes member name when provided", () => {
    expect(
      buildSplitPartDescription({
        baseDescription: "Depósito Fernanda Amazin",
        partIndex: 1,
        partCount: 2,
        partAmount: 30,
        totalAmount: 60,
        memberName: "João",
      }),
    ).toBe("João · parte 1/2 · R$ 30,00 de R$ 60,00 · Depósito Fernanda Amazin");
  });
});

describe("formatSplitBeneficiaries", () => {
  it("lists members and amounts in part order", () => {
    expect(
      formatSplitBeneficiaries([
        { id: "b", amount: 30, splitIndex: 2, memberName: "Bruno", description: "b" },
        { id: "a", amount: 30, splitIndex: 1, memberName: "Ana", description: "a" },
      ]),
    ).toBe("Ana (R$ 30,00) · Bruno (R$ 30,00)");
  });

  it("falls back when a part has no member", () => {
    expect(formatSplitBeneficiaries([{ id: "a", amount: 40, splitIndex: 1, memberName: null, description: "x" }])).toBe(
      "sem associado (R$ 40,00)",
    );
  });
});
