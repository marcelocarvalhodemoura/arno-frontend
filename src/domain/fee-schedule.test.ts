import { describe, expect, it } from "vitest";
import { DEFAULT_FEE_SCHEDULE, feeCategoryOf, periodRangeLabel } from "./fee-schedule";

describe("feeCategoryOf", () => {
  it("identifica o perfil e o período da composição", () => {
    const regular = feeCategoryOf({ branch: "escoteiro", clubeLtc: false }, "2026-09", DEFAULT_FEE_SCHEDULE);
    expect(regular.key).toBe("regular");
    expect(regular.label).toBe("Demais ramos · não sócio");
    expect(regular.periodLabel).toBe("A partir de mai/2026");
    expect(regular.breakdown).toContain("Clube R$ 10,00 / R$ 20,00");

    const socio = feeCategoryOf({ branch: "escoteiro", clubeLtc: true }, "2026-09", DEFAULT_FEE_SCHEDULE);
    expect(socio.label).toBe("Demais ramos · sócio Lindóia");
    expect(socio.breakdown).not.toContain("Clube");

    const pioneer = feeCategoryOf({ branch: "pioneiro", clubeLtc: false }, "2026-03", DEFAULT_FEE_SCHEDULE);
    expect(pioneer.key).toBe("pioneer");
    expect(pioneer.periodLabel).toBe("mar/2026 a abr/2026");
    expect(pioneer.pendingSplit).toBe(true);
  });

  it("distingue valor especial de família, personalizado e quem não paga", () => {
    const sibling = { branch: "escoteiro", clubeLtc: true, feeOverride: 82 };
    expect(feeCategoryOf(sibling, "2026-09", DEFAULT_FEE_SCHEDULE).key).toBe("familyMember");
    // Março/abril não têm valor especial: paga a tabela do ramo.
    expect(feeCategoryOf(sibling, "2026-03", DEFAULT_FEE_SCHEDULE).key).toBe("regular");
    expect(
      feeCategoryOf({ branch: "lobinho", clubeLtc: false, feeOverride: 50 }, "2026-09", DEFAULT_FEE_SCHEDULE).key,
    ).toBe("custom");
    expect(
      feeCategoryOf({ branch: "lobinho", role: "escotista", clubeLtc: false }, "2026-09", DEFAULT_FEE_SCHEDULE).key,
    ).toBe("exempt");
  });

  it("descreve o período", () => {
    expect(periodRangeLabel({ startMonth: "2026-11", endMonth: "2026-11" })).toBe("nov/2026");
  });
});
