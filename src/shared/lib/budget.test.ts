import { describe, expect, it } from "vitest";
import { budgetPaceMonth, budgetStatus } from "./budget";

describe("budgetPaceMonth", () => {
  const today = new Date(2026, 9, 3);

  it("uses the full year for closed years", () => {
    expect(budgetPaceMonth(2025, today)).toBe(12);
    expect(budgetStatus(1200, 1100, budgetPaceMonth(2025, today))).toBe("ok");
  });

  it("uses the current month for the current year", () => {
    expect(budgetPaceMonth(2026, today)).toBe(10);
  });

  it("has no pace for future years", () => {
    expect(budgetPaceMonth(2027, today)).toBeNull();
    expect(budgetStatus(1200, 100, budgetPaceMonth(2027, today))).toBe("ok");
  });
});
