// packages/slash-ssr/src/state-script.test.ts
import { describe, test, expect } from "bun:test";
import { renderStateScript } from "./state-script";

describe("renderStateScript", () => {
  test("não deixa o estado fechar o <script> da página", () => {
    const state = { name: "</script><img src=x onerror=alert(1)>" };
    const out = renderStateScript(state);

    // Só o </script> de fechamento do próprio bloco pode existir
    expect(out.match(/<\/script>/gi)).toHaveLength(1);
    expect(out).not.toContain("<img");
  });

  test("o conteúdo do script continua sendo o estado original", () => {
    const state = { name: "</script><img src=x onerror=alert(1)>", n: 1 };
    const out = renderStateScript(state);
    const json = out.replace(/^[\s\S]*?<script[^>]*>/, "").replace(/<\/script>[\s\S]*$/, "");

    expect(JSON.parse(json)).toEqual(state);
  });
});
