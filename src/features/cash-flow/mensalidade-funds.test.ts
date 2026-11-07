import { describe, expect, it } from "vitest";
import { fundParts, type MensalidadeFunds } from "./MensalidadeFundsLine";

const funds: MensalidadeFunds = {
  memberBranch: "lobinho",
  groupCash: 47.5,
  operational: 43,
  dilution: 4.5,
  lateFee: 0,
  arrears: 0,
  branch: 8,
  snack: 24,
  club: 10,
  difference: 0,
  pendingSplit: false,
  preview: false,
};

describe("fundParts", () => {
  it("lists the funds of a Grupo mensalidade and they add up to what was received", () => {
    const parts = fundParts(funds);
    expect(parts.map((part) => [part.label, part.amount])).toEqual([
      ["Operacional (caixa do grupo)", 47.5],
      ["Caixinha Lobinho", 8],
      ["Lanche", 24],
      ["Clube", 10],
    ]);
    expect(parts.reduce((sum, part) => sum + part.amount, 0)).toBe(89.5);
    expect(parts[0].hint?.replace(/\s/g, " ")).toBe("operacional R$ 43,00 + diluição R$ 4,50");
  });

  it("shows a payment below the table as its own part to check", () => {
    const parts = fundParts({ ...funds, difference: -9.5 });
    expect(parts.at(-1)).toMatchObject({ label: "A menos que a tabela", amount: -9.5, hint: "a conferir" });
  });
});
