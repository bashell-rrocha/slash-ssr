// src/headers.test.ts
import { describe, expect, test } from "bun:test";
import { applyHeaders, loadHeaderRules, matchHeaders, parseHeaders } from "./headers";

describe("parseHeaders", () => {
  test("lê blocos por caminho com seus cabeçalhos", () => {
    // Arrange
    const texto = "/*\n  X-Frame-Options: DENY\n  X-Content-Type-Options: nosniff\n\n/admin\n  Cache-Control: no-store\n";

    // Act
    const regras = parseHeaders(texto);

    // Assert
    expect(regras).toEqual([
      { path: "/*", headers: [["X-Frame-Options", "DENY"], ["X-Content-Type-Options", "nosniff"]] },
      { path: "/admin", headers: [["Cache-Control", "no-store"]] },
    ]);
  });

  test("ignora comentários, linhas em branco, CRLF e valor com dois-pontos", () => {
    // Arrange
    const texto = "# topo\r\n/*\r\n  # nota\r\n  Link: <https://x.test/a>; rel=preload\r\n";

    // Act
    const regras = parseHeaders(texto);

    // Assert
    expect(regras).toEqual([{ path: "/*", headers: [["Link", "<https://x.test/a>; rel=preload"]] }]);
  });

  test("descarta linha de cabeçalho sem caminho, sem dois-pontos ou sem nome/valor", () => {
    // Arrange
    const texto = "  Orfao: 1\n/*\n  semdoispontos\n  : vazio\n  Nome:\n  Ok: sim\n";

    // Act
    const regras = parseHeaders(texto);

    // Assert
    expect(regras).toEqual([{ path: "/*", headers: [["Ok", "sim"]] }]);
  });

  test("texto vazio não gera regras", () => {
    expect(parseHeaders("")).toEqual([]);
  });
});

describe("matchHeaders", () => {
  const regras = parseHeaders(
    "/*\n  A: raiz\n/x/*\n  B: x\n/exato\n  C: exato\n/a.b\n  D: ponto\n",
  );

  test("/* casa qualquer caminho", () => {
    expect(matchHeaders(regras, "/qualquer/coisa")).toEqual([["A", "raiz"]]);
    expect(matchHeaders(regras, "/")).toEqual([["A", "raiz"]]);
  });

  test("caminho exato casa só ele", () => {
    expect(matchHeaders(regras, "/exato")).toEqual([["A", "raiz"], ["C", "exato"]]);
    expect(matchHeaders(regras, "/exato/mais")).toEqual([["A", "raiz"]]);
  });

  test("curinga /x/* casa o que vem depois do prefixo", () => {
    expect(matchHeaders(regras, "/x/y/z")).toEqual([["A", "raiz"], ["B", "x"]]);
    expect(matchHeaders(regras, "/xy")).toEqual([["A", "raiz"]]);
  });

  test("caracteres especiais do caminho são literais", () => {
    expect(matchHeaders(regras, "/a.b")).toEqual([["A", "raiz"], ["D", "ponto"]]);
    expect(matchHeaders(regras, "/aXb")).toEqual([["A", "raiz"]]);
  });

  test("mesmo cabeçalho em dois blocos é unido com vírgula", () => {
    // Arrange
    const r = parseHeaders("/*\n  Link: a\n/p\n  Link: b\n");

    // Act / Assert
    expect(matchHeaders(r, "/p")).toEqual([["Link", "a, b"]]);
  });
});

describe("applyHeaders", () => {
  test("acrescenta os cabeçalhos sem sobrescrever o que a resposta já define", () => {
    // Arrange
    const res = new Response("ok", { headers: { "Referrer-Policy": "no-referrer" } });

    // Act
    const out = applyHeaders(res, [["Referrer-Policy", "origin"], ["X-Frame-Options", "DENY"]]);

    // Assert
    expect(out.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(out.headers.get("X-Frame-Options")).toBe("DENY");
  });

  test("sem cabeçalhos devolve a mesma resposta", () => {
    const res = new Response("ok");
    expect(applyHeaders(res, [])).toBe(res);
  });

  test("ignora nome inválido sem derrubar a resposta", () => {
    const out = applyHeaders(new Response("ok"), [["Nome Invalido", "x"], ["Ok", "1"]]);
    expect(out.headers.get("Ok")).toBe("1");
  });
});

describe("loadHeaderRules", () => {
  test("usa o primeiro _headers que existir e devolve [] quando não há nenhum", async () => {
    // Arrange
    const { mkdtemp, mkdir, writeFile } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const base = await mkdtemp(join(tmpdir(), "headers-"));
    const vazia = join(base, "vazia");
    const com = join(base, "com");
    await mkdir(vazia);
    await mkdir(com);
    await writeFile(join(com, "_headers"), "/*\n  X-A: 1\n");

    // Act
    const achou = await loadHeaderRules([vazia, com]);
    const nada = await loadHeaderRules([vazia]);

    // Assert
    expect(achou).toEqual([{ path: "/*", headers: [["X-A", "1"]] }]);
    expect(nada).toEqual([]);
  });
});
