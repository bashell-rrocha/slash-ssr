import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { exampleSite } from "@_bashell/slash-ui/host";

// Hospedeiro de exemplo do slash-ui no slash-ssr: cada requisição renderiza a página no servidor (com o tema no
// <html> e o estado para a hidratação); os arquivos do build (temas, PWA, ícones, bundle) saem do dist/.

const ROOT = import.meta.dir;

describe("ui:build + handler (slash-ssr)", async () => {
  const proc = Bun.spawn(["bun", "run", join(ROOT, "build.ts")], { stdout: "pipe", stderr: "pipe" });
  const [stderr, code] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
  const { createHandler, readAssets } = (await import(join(ROOT, "dist", "server.js"))) as typeof import("./src/server");
  const handle = createHandler(readAssets(join(ROOT, "dist")), join(ROOT, "dist"));
  const get = async (path: string) => {
    const res = await handle(new Request(`http://localhost${path}`));
    return { status: res.status, type: res.headers.get("content-type") ?? "", body: await res.text() };
  };

  test("o build termina sem erro", () => {
    expect([code, stderr.includes("error")]).toEqual([0, false]);
  });

  test("toda rota do site responde 200 com a tela, o tema da página no <html> e o estado para hidratar", async () => {
    // Arrange
    const pages = exampleSite();

    // Act
    const results = await Promise.all(pages.map((page) => get(page.path)));

    // Assert
    expect(
      results.map((r, i) => [r.status, /<html[^>]*>/.exec(r.body)?.[0], r.body.includes('<div id="app">')]),
    ).toEqual(
      pages.map((p) => [200, `<html lang="pt-BR" data-theme="${p.theme}" data-mode="${p.mode}">`, true]),
    );
    expect(results[0]?.body).toContain('<script id="__SLASH_STATE__" type="application/json">');
    expect(results[0]?.body).toMatch(/<script type="module" src="\/client-\w+\.js"><\/script>/);
  });

  test("sem a barra final também acha a página; índice em /; 404 para o resto", async () => {
    // Arrange / Act
    const [noSlash, index, missing] = await Promise.all([get("/app/hoje"), get("/"), get("/nada/")]);

    // Assert
    expect(noSlash.status).toBe(200);
    expect(index.body).toContain("slash-ui: site de exemplo");
    expect(missing.status).toBe(404);
  });

  test("PWA e arquivos do build: manifest com o tipo certo, service worker, tema e ícones", async () => {
    // Arrange / Act
    const [manifest, sw, theme, icon] = await Promise.all([
      get("/app/manifest.webmanifest"),
      get("/app/sw.js"),
      get("/themes/dist/brisa.css"),
      handle(new Request("http://localhost/app/icons/icon-192.png")),
    ]);

    // Assert
    expect([manifest.status, manifest.type]).toEqual([200, "application/manifest+json"]);
    expect(sw.body).toContain('"/app/hoje/"');
    expect(theme.body).toContain('[data-theme="brisa"]');
    expect(icon.status).toBe(200);
  });

  test("requisições seguidas não se misturam: cada uma renderiza a própria página", async () => {
    // Arrange / Act
    const [a, b] = await Promise.all([get("/app/lembretes/conta-de-luz/"), get("/app/lembretes/buscar-a-bia/")]);

    // Assert
    expect(a.body).toContain("Pagar a conta de luz");
    expect(a.body).not.toContain("Buscar a Bia na natação");
    expect(b.body).toContain("Buscar a Bia na natação");
  });

  test("caminho para fora do dist/ é recusado", async () => {
    // Arrange / Act
    const res = await get("/../package.json");

    // Assert
    expect(res.status).not.toBe(200);
  });
});
