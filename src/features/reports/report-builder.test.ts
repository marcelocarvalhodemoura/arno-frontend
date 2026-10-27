import { describe, expect, it } from "vitest";
import { builderTitle, type BuilderState } from "./ReportBuilder";

const base: BuilderState = {
  from: "2026-01-01",
  to: "2026-06-30",
  types: [],
  groupBy: "movementType",
  branches: [],
  movementTypeIds: [],
  memberIds: [],
  showLedger: false,
};

describe("builderTitle", () => {
  it("names the document from the choices", () => {
    expect(builderTitle(base)).toBe("Entradas e saídas por tipo de movimentação");
    expect(builderTitle({ ...base, types: ["expense"], branches: ["lobinho"] })).toBe(
      "Saídas por tipo de movimentação · Lobinho",
    );
    expect(builderTitle({ ...base, types: ["income"], groupBy: "none" })).toBe("Entradas lançamento a lançamento");
  });

  it("uses the member name when only one is chosen", () => {
    const members = [{ id: "m1", name: "ANA SOUZA" }];
    expect(builderTitle({ ...base, groupBy: "month", memberIds: ["m1"] }, members)).toBe(
      "Entradas e saídas por mês · ANA SOUZA",
    );
    expect(builderTitle({ ...base, memberIds: ["m1", "m2"] }, members)).toBe(
      "Entradas e saídas por tipo de movimentação · 2 associados",
    );
  });
});
