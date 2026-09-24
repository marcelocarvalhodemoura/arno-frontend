import { describe, expect, it } from "vitest";
import { buildSplitPartDescription } from "./split-description";

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
