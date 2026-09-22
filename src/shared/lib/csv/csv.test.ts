import { describe, expect, it } from "vitest";
import { collapseMappedMembers, mapMemberRow, mapMemberTable, mapTxRow, parseCsv, parseIsoDate, parseBranch, parseTxType } from "@/shared/lib/csv";

const csv = `nome;email;telefone;ramo;papel;mensalidade;ingresso;clube_ltc
João da Silva;joao.silva@arnofriedrich.org.br;(51) 99999-1111;Escoteiro;jovem;60,00;01/03/2026;não
`;

describe("parseCsv", () => {
  it("reads semicolon CSV with Brazilian headers", () => {
    const table = parseCsv(csv);
    expect(table.headers).toContain("nome");
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]?.nome).toBe("João da Silva");
  });

  it("keeps quoted commas and accepts comma-separated files", () => {
    const table = parseCsv(`nome,email\n"Silva, João",joao@arnofriedrich.org.br\n`);
    expect(table.rows[0]?.nome).toBe("Silva, João");
    expect(table.rows[0]?.email).toBe("joao@arnofriedrich.org.br");
  });

  it("keeps the first e-mail when the sheet repeats the Email column", () => {
    const table = parseCsv(`Associado;Email;Ramo;Email \nAna Souza;ana@arnofriedrich.org.br;lobinho;\n`);
    expect(table.headers).toContain("email");
    expect(table.headers).toContain("email_2");
    expect(table.rows[0]?.email).toBe("ana@arnofriedrich.org.br");
  });
});

describe("parsers", () => {
  it("converts BR dates and branch labels", () => {
    expect(parseIsoDate("01/03/2026")).toBe("2026-03-01");
    expect(parseIsoDate("2026-03-01")).toBe("2026-03-01");
    expect(parseBranch("Filhotes")).toBe("filhote");
    expect(parseBranch("Flor de Lis")).toBe("flor-de-lis");
    expect(parseBranch("CFL")).toBe("flor-de-lis");
    expect(parseBranch("Escoteira")).toBe("escoteiro");
    expect(parseBranch("DIRETORIA")).toBe("flor-de-lis");
    expect(parseTxType("Entrada")).toBe("income");
    expect(parseTxType("Saída")).toBe("expense");
    expect(parseIsoDate("45321")).toBe("2024-01-30");
  });
});

describe("mapMemberRow", () => {
  it("maps a valid associate row", () => {
    const table = parseCsv(csv);
    const mapped = mapMemberRow(table.rows[0]!);
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.branch).toBe("escoteiro");
      expect(mapped.value.monthlyFee).toBe(89.5);
      expect(mapped.value.joinedAt).toBe("2026-03-01");
      expect(mapped.value.clubeLtc).toBe(false);
    }
  });

  it("maps a responsible on launched associate rows", () => {
    const mapped = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Helena Souza",
      parentesco: "Mãe",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.guardians?.[0]?.name).toBe("Helena Souza");
      expect(mapped.value.guardians?.[0]?.relationship).toBe("Mãe");
    }
  });

  it("maps two responsibles on the same associate row", () => {
    const mapped = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Helena Souza",
      parentesco: "Mãe",
      telefone_responsavel: "(51) 99999-1002",
      email_responsavel: "helena.souza@arnofriedrich.org.br",
      responsavel_2: "Carlos Souza",
      parentesco_2: "Pai",
      telefone_responsavel_2: "(51) 99999-1003",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.guardians).toHaveLength(2);
      expect(mapped.value.guardians?.[0]?.name).toBe("Helena Souza");
      expect(mapped.value.guardians?.[0]?.relationship).toBe("Mãe");
      expect(mapped.value.guardians?.[1]?.name).toBe("Carlos Souza");
      expect(mapped.value.guardians?.[1]?.relationship).toBe("Pai");
    }
  });

  it("maps mother and father columns and kinship in the same cell", () => {
    const mapped = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      mae: "Helena Souza",
      pai: "Carlos Souza",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.guardians).toHaveLength(2);
      expect(mapped.value.guardians?.[0]).toMatchObject({ name: "Helena Souza", relationship: "Mãe" });
      expect(mapped.value.guardians?.[1]).toMatchObject({ name: "Carlos Souza", relationship: "Pai" });
    }
  });

  it("splits two responsibles written in one cell", () => {
    const mapped = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Helena Souza (Mãe); Carlos Souza (Pai)",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.guardians).toHaveLength(2);
      expect(mapped.value.guardians?.map((item) => item.relationship)).toEqual(["Mãe", "Pai"]);
    }
  });

  it("collapses two spreadsheet rows of the same associate into one with both guardians", () => {
    const first = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Helena Souza",
      parentesco: "Mãe",
    });
    const second = mapMemberRow({
      nome: "Ana Souza",
      email: "ana.souza@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      mensalidade: "55,00",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Carlos Souza",
      parentesco: "Pai",
    });
    const collapsed = collapseMappedMembers([
      { line: 2, mapped: first },
      { line: 3, mapped: second },
    ]);
    expect(collapsed).toHaveLength(1);
    expect(collapsed[0]?.mapped.ok).toBe(true);
    if (collapsed[0]?.mapped.ok) {
      expect(collapsed[0].mapped.value.guardians).toHaveLength(2);
    }
  });

  it("fills missing e-mail and groups two responsible rows of the same youth", () => {
    const mapped = mapMemberRow({
      nome: "Sem e-mail",
      email: "",
      telefone: "(51) 99999-0000",
      ramo: "escoteiro",
      papel: "jovem",
      mensalidade: "60,00",
      ingresso: "01/03/2026",
      clube_ltc: "não",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.email).toContain("@arnofriedrich.org.br");
    }

    const table = mapMemberTable([
      {
        associado: "Ana Souza",
        ramo: "Lobinho",
        responsavel: "Helena Souza",
        parentesco: "Mãe",
        telefone: "(51) 99999-1002",
      },
      {
        associado: "Ana Souza",
        ramo: "Lobinho",
        responsavel: "Carlos Souza",
        parentesco: "Pai",
        telefone: "(51) 99999-1003",
      },
    ]);
    expect(table).toHaveLength(1);
    expect(table[0]?.mapped.ok).toBe(true);
    if (table[0]?.mapped.ok) {
      expect(table[0].mapped.value.role).toBe("jovem");
      expect(table[0].mapped.value.guardians).toHaveLength(2);
      expect(table[0].mapped.value.guardians?.map((item) => item.relationship)).toEqual(["Mãe", "Pai"]);
    }
  });

  it("reads the responsáveis/associados/ramos spreadsheet layout", () => {
    const table = parseCsv(`Associado;Email;Telefone;Clube L;Mensalidade;Papel;Ramo;Ingresso;Responsável;Parent;Telefone2;email2;Resp2;Parent2;Telefone3;Email
Ana Souza;ana@arnofriedrich.org.br;(51) 99999-1001;não;55;Jovem;Lobinho;45321;Helena Souza;Mãe;(51) 99999-1002;helena@arnofriedrich.org.br;Carlos Souza;Pai;(51) 99999-1003;
Bruno Lima;bruno@arnofriedrich.org.br;(51) 99999-2002;sim;0;Adulta;CFL;11/03/2023;;;;;;;
Carla Dias;carla@arnofriedrich.org.br;(51) 99999-3003;não;0;Adulto;DIRETORIA;;;;;;;;
`);
    const mapped = mapMemberTable(table.rows);
    expect(mapped.every((row) => row.mapped.ok)).toBe(true);
    const values = mapped.flatMap((row) => (row.mapped.ok ? [row.mapped.value] : []));
    expect(values[0]?.guardians).toHaveLength(2);
    expect(values[0]?.guardians?.map((item) => item.relationship)).toEqual(["Mãe", "Pai"]);
    expect(values[0]?.monthlyFee).toBe(89.5);
    expect(values[1]).toMatchObject({ role: "escotista", branch: "flor-de-lis", clubeLtc: true, monthlyFee: 0 });
    expect(values[2]).toMatchObject({ role: "dirigente", branch: "flor-de-lis", monthlyFee: 0 });
  });

  it("drops a responsible e-mail that is not an e-mail", () => {
    const mapped = mapMemberRow({
      associado: "Ana Souza",
      email: "ana@arnofriedrich.org.br",
      telefone: "(51) 99999-1001",
      ramo: "lobinho",
      papel: "jovem",
      ingresso: "11/03/2023",
      clube_ltc: "não",
      responsavel: "Helena Souza",
      parentesco: "Mãe",
      email2: "nao informado no cadastro",
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.guardians?.[0]?.name).toBe("Helena Souza");
      expect(mapped.value.guardians?.[0]?.email).toBe("");
    }
  });
});

describe("mapTxRow", () => {
  it("matches movement type and member by name", () => {
    const table = parseCsv(`data;tipo;natureza;tipo_movimentacao;descricao;valor;ramo;meio;situacao;associado
14/09/2026;entrada;variável;Doação;Doação Pix;150,00;grupo;pix;pago;Ana Souza
`);
    const mapped = mapTxRow(table.rows[0]!, {
      movementTypes: [{ id: "mt1", name: "Doação", direction: "income" }],
      members: [{ id: "m1", name: "Ana Souza" }],
    });
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(mapped.value.movementTypeId).toBe("mt1");
      expect(mapped.value.memberId).toBe("m1");
      expect(mapped.value.amount).toBe(150);
      expect(mapped.value.date).toBe("2026-09-14");
    }
  });
});

describe("chunkList", () => {
  it("splits rows into fixed-size batches", async () => {
    const { chunkList, IMPORT_CHUNK_SIZE } = await import("@/domain");
    const items = Array.from({ length: 450 }, (_, index) => index);
    const chunks = chunkList(items);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(IMPORT_CHUNK_SIZE);
    expect(chunks[1]).toHaveLength(IMPORT_CHUNK_SIZE);
    expect(chunks[2]).toHaveLength(50);
  });
});

describe("splitAfterHeader", () => {
  it("keeps the header on every read chunk", async () => {
    const { splitAfterHeader } = await import("@/modules/statement/import-chunks");
    const header = "nome;email";
    const rows = Array.from({ length: 450 }, (_, index) => `Pessoa ${index};p${index}@arnofriedrich.org.br`);
    const { parts, truncated } = splitAfterHeader([header, ...rows].join("\n"), 0);
    expect(truncated).toBe(false);
    expect(parts).toHaveLength(3);
    expect(parts[0]?.startsWith("nome;email\n")).toBe(true);
    expect(parts[2]?.startsWith("nome;email\n")).toBe(true);
  });

  it("does not repeat data rows across chunks", async () => {
    const { splitAfterHeader } = await import("@/modules/statement/import-chunks");
    const header = "data;historico;valor";
    const rows = Array.from({ length: 450 }, (_, index) => `14/08/2026;PIX ${index};10,00`);
    const { parts } = splitAfterHeader([header, header, ...rows].join("\n"), 0);
    const data = parts.flatMap((part) => part.split("\n").slice(1));
    expect(data).toHaveLength(450);
    expect(new Set(data).size).toBe(450);
  });
});
