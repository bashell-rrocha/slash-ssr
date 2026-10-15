// src/port.test.ts
import { describe, expect, test } from "bun:test";
import { DEFAULT_PORT, parsePort } from "./port";

describe("parsePort", () => {
  test("ausente, vazia ou só espaços usa a porta padrão (4000)", () => {
    // Arrange
    const entradas = [undefined, "", "   "];

    // Act
    const portas = entradas.map((raw) => parsePort(raw));

    // Assert
    expect(DEFAULT_PORT).toBe(4000);
    expect(portas).toEqual([4000, 4000, 4000]);
  });

  test("aceita inteiros de 1 a 65535, com espaços em volta", () => {
    // Arrange
    const entradas = ["1", "8080", " 4251 ", "65535"];

    // Act
    const portas = entradas.map((raw) => parsePort(raw));

    // Assert
    expect(portas).toEqual([1, 8080, 4251, 65535]);
  });

  test("usa o padrão informado quando PORT está ausente", () => {
    // Arrange
    const padrao = 5555;

    // Act
    const porta = parsePort(undefined, padrao);

    // Assert
    expect(porta).toBe(5555);
  });

  test.each(["abc", "0", "65536", "-1", "3.5", "1e3", "0x10", "80abc", "+80"])(
    "recusa %p com erro em português",
    (raw) => {
      // Arrange
      const ler = () => parsePort(raw);

      // Act + Assert
      expect(ler).toThrow(`PORT inválida: "${raw}" (use um número inteiro entre 1 e 65535)`);
    },
  );
});
