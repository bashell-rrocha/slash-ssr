import { renderToString } from "@_bashell/slash/ssr";
import { view } from "@_bashell/slash-ui/core";
import {
  documentHead,
  EXAMPLE_APP,
  exampleSite,
  findPage,
  htmlAttrsText,
  renderPage,
  type SitePage,
  siteIndex,
} from "@_bashell/slash-ui/host";
import { resolveStatic } from "@_bashell/slash-ui/host/node";
import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { renderStateScript } from "../../../src/state-script";

// Servidor do site de exemplo do slash-ui no slash-ssr: cada requisição renderiza a página (renderToString) com o
// tema no <html>, o head do kit e o estado para a hidratação; os arquivos do build saem do dist/. Nada guardado entre
// requisições além do que é só leitura (a lista de páginas e os nomes dos arquivos do build).

export interface Assets {
  js: string;
  css: string[];
  themeColor: string;
}

const TYPES: Record<string, string> = {
  ".webmanifest": "application/manifest+json",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

/** O que o site publica do dist/: o tema, o app (manifest, service worker, ícones) e o bundle do cliente. O código do
 *  servidor (main.js, server.js) e o assets.json ficam de fora. */
const PUBLIC = (rel: string) => /^(themes|app)\//.test(rel) || /^(client|chunk)-[\w-]+\.(js|css)$/.test(rel);

/** Os nomes do bundle do cliente gravados pelo build (dist/assets.json). */
export function readAssets(dist: string): Assets {
  return JSON.parse(readFileSync(join(dist, "assets.json"), "utf8")) as Assets;
}

const NOT_FOUND_TITLE = "Página não encontrada";

const INDEX: SitePage = {
  ...exampleSite()[0],
  path: "/",
  title: "slash-ui: site de exemplo",
  theme: EXAMPLE_APP.theme,
  mode: "light",
  app: false,
} as SitePage;

function documentFor(page: SitePage, body: string, state: unknown, assets: Assets): string {
  const head = documentHead(page, {
    base: "/",
    css: assets.css,
    manifest: "/app/manifest.webmanifest",
    themeColor: assets.themeColor,
  });
  return `<!doctype html>
<html${htmlAttrsText(page)}>
<head>
${head}
</head>
<body>
<div id="app">${body}</div>${renderStateScript(state)}
<script type="module" src="${assets.js}"></script>
</body>
</html>
`;
}

export function createHandler(assets: Assets, dist: string): (req: Request) => Response {
  const pages = exampleSite();
  return (req) => {
    const path = new URL(req.url).pathname;
    if (extname(path)) {
      const found = resolveStatic(dist, path, PUBLIC);
      if ("file" in found) {
        const type = TYPES[extname(found.file)];
        return new Response(Bun.file(found.file), type ? { headers: { "content-type": type } } : undefined);
      }
      if (found.status !== 404)
        return new Response(found.status === 400 ? "endereço inválido" : "fora do site", { status: found.status });
      return new Response("não encontrado", { status: 404 });
    }
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return new Response("endereço inválido", { status: 400 });
    }
    const page = decoded === "/" ? INDEX : findPage(pages, decoded);
    const html = (target: SitePage, body: string, state: unknown, status = 200) =>
      new Response(documentFor(target, body, state, assets), {
        status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    if (!page) {
      const { html: body, state } = renderToString(() => view`<main><h1>${NOT_FOUND_TITLE}</h1></main>`);
      return html({ ...INDEX, title: NOT_FOUND_TITLE }, body, state, 404);
    }
    const { html: body, state } = renderToString(() => (page === INDEX ? siteIndex(pages) : renderPage(page)));
    return html(page, body, state);
  };
}
