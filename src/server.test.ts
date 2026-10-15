// src/server.test.ts
// Sobe o servidor de verdade num processo à parte e confere o que ele diz no terminal.
import { describe, expect, test } from "bun:test";

const SERVER = new URL("./server.ts", import.meta.url).pathname;

async function lerAte(stream: ReadableStream<Uint8Array>, trecho: string): Promise<string> {
  const decoder = new TextDecoder();
  let texto = "";
  for await (const parte of stream) {
    texto += decoder.decode(parte, { stream: true });
    if (texto.includes(trecho)) break;
  }
  return texto;
}

describe("src/server.ts", () => {
  test("anuncia a porta efetiva quando PORT é válida", async () => {
    // Arrange
    const proc = Bun.spawn([process.execPath, SERVER], {
      env: { ...process.env, PORT: "4256" },
      stdout: "pipe",
      stderr: "pipe",
    });

    try {
      // Act
      const saida = await lerAte(proc.stdout, "\n");

      // Assert
      expect(saida).toContain("http://localhost:4256");
      expect(saida).not.toContain("localhost:4000");
    } finally {
      proc.kill();
      await proc.exited;
    }
  });

  test("recusa PORT inválida com erro em português e código de saída 1", async () => {
    // Arrange
    const proc = Bun.spawn([process.execPath, SERVER], {
      env: { ...process.env, PORT: "abc" },
      stdout: "pipe",
      stderr: "pipe",
    });

    try {
      // Act
      const codigo = await proc.exited;
      const erro = await new Response(proc.stderr).text();

      // Assert
      expect(codigo).toBe(1);
      expect(erro).toContain('PORT inválida: "abc" (use um número inteiro entre 1 e 65535)');
    } finally {
      proc.kill();
    }
  });
});
