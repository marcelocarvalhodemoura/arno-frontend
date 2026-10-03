import { describe, expect, it } from "vitest";
import type { Member } from "@/domain";
import {
  autoMensalidadeDescription,
  checkLaunch,
  competenceDate,
  launchKindOf,
  launchSummary,
  type LaunchCheckInput,
} from "./launch-form";

const ana = {
  id: "ana",
  name: "ANA SOUZA",
  branch: "escoteiro",
  role: "jovem",
  clubeLtc: false,
  monthlyFee: 89.5,
  feeOverride: null,
} as unknown as Member;

function input(partial: Partial<LaunchCheckInput>): LaunchCheckInput {
  return {
    kind: "mensalidade",
    movementTypeId: "mens",
    typeChosen: true,
    amount: 89.5,
    description: "Mensalidade Maio 2026 — ANA SOUZA",
    member: ana,
    paymentStatus: "paid",
    date: "2026-05-10",
    paidAt: "2026-05-11",
    today: "2026-10-02",
    existing: [],
    ...partial,
  };
}

describe("launchKindOf", () => {
  it("classifica mensalidade, dívida e demais tipos", () => {
    expect(launchKindOf("Mensalidade")).toBe("mensalidade");
    expect(launchKindOf("Acordo / dívida diluída")).toBe("agreement");
    expect(launchKindOf("Dívida")).toBe("agreement");
    expect(launchKindOf("Noite do Hamburguer")).toBe("other");
    expect(launchKindOf(undefined)).toBe("other");
  });
});

describe("competenceDate", () => {
  it("usa o dia de vencimento e respeita o fim do mês", () => {
    expect(competenceDate("2026-05", 10)).toBe("2026-05-10");
    expect(competenceDate("2026-02", 31)).toBe("2026-02-28");
    expect(competenceDate("", 10)).toBe("");
  });
});

describe("checkLaunch", () => {
  it("aceita mensalidade coerente sem avisos", () => {
    expect(checkLaunch(input({}))).toEqual({ errors: [], warnings: [] });
  });

  it("exige tipo, valor e associado na mensalidade", () => {
    const result = checkLaunch(input({ typeChosen: false, amount: 0, member: null }));
    expect(result.errors).toContain("Escolha o que é este lançamento.");
    expect(result.errors).toContain("Informe o valor.");
    expect(result.errors).toContain("Escolha o associado da mensalidade.");
  });

  it("exige data de pagamento quando já foi pago", () => {
    expect(checkLaunch(input({ paidAt: "" })).errors).toContain("Informe quando foi pago.");
    expect(checkLaunch(input({ paymentStatus: "pending", paidAt: "" })).errors).toEqual([]);
  });

  it("avisa valor fora da tabela e pagamento no futuro", () => {
    const result = checkLaunch(input({ amount: 45, paidAt: "2026-12-01" }));
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((w) => w.startsWith("Valor diferente da tabela"))).toBe(true);
    expect(result.warnings).toContain("A data de pagamento está no futuro.");
  });

  it("avisa quando já existe mensalidade do mesmo mês", () => {
    const result = checkLaunch(
      input({
        existing: [
          {
            id: "p1",
            date: "2026-05-10",
            amount: 89.5,
            movementTypeId: "mens",
            memberId: "ana",
            paymentStatus: "pending",
          },
        ],
      }),
    );
    expect(result.warnings[0]).toMatch(/Já existe mensalidade de maio\/2026.*pendente.*Marcar como pago/);
  });

  it("não acusa duplicidade com o próprio lançamento em edição", () => {
    const result = checkLaunch(
      input({
        editingId: "p1",
        existing: [{ id: "p1", date: "2026-05-10", amount: 89.5, movementTypeId: "mens", memberId: "ana" }],
      }),
    );
    expect(result.warnings).toEqual([]);
  });

  it("avisa lançamento comum repetido no mesmo dia e valor", () => {
    const result = checkLaunch(
      input({
        kind: "other",
        movementTypeId: "cantina",
        member: null,
        description: "Cantina do sábado",
        amount: 120,
        date: "2026-05-16",
        existing: [{ id: "x", date: "2026-05-16", amount: 120, movementTypeId: "cantina" }],
      }),
    );
    expect(result.warnings).toEqual(["Já existe um lançamento igual em 16/05/2026."]);
  });
});

describe("launchSummary", () => {
  it("monta a frase da mensalidade paga", () => {
    const text = launchSummary({
      kind: "mensalidade",
      type: "income",
      amount: 89.5,
      description: "",
      memberName: "ANA SOUZA",
      date: "2026-05-10",
      paymentStatus: "paid",
      paidAt: "2026-05-11",
      methodLabel: "Pix",
    })
      .map((part) => part.text)
      .join("");
    expect(text.replace(/ /g, " ")).toBe(
      "Entrada de R$ 89,50 · mensalidade de maio/2026 de ANA SOUZA · pago em 11/05/2026 via Pix.",
    );
  });

  it("monta a frase de uma saída pendente", () => {
    const text = launchSummary({
      kind: "other",
      type: "expense",
      typeName: "Bivaque Distrital",
      amount: 300,
      description: "Gás do acampamento",
      date: "2026-06-20",
      paymentStatus: "pending",
      paidAt: "",
      methodLabel: "Pix",
    })
      .map((part) => part.text)
      .join("");
    expect(text.replace(/ /g, " ")).toBe(
      "Saída de R$ 300,00 · Bivaque Distrital: Gás do acampamento · pendente, vence em 20/06/2026.",
    );
  });

  it("gera a descrição automática da mensalidade", () => {
    expect(autoMensalidadeDescription("2026-05-10", "ANA SOUZA")).toBe("Mensalidade Maio 2026 — ANA SOUZA");
  });
});
