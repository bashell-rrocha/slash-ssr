import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
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

/** Os nomes do bundle do cliente gravados pelo build (dist/assets.json). */
export function readAssets(dist: string): Assets {
  return JSON.parse(readFileSync(join(dist, "assets.json"), "utf8")) as Assets;
}

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
    const path = decodeURIComponent(new URL(req.url).pathname);
    const file = normalize(join(dist, path));
    if (!file.startsWith(dist)) return new Response("fora do site", { status: 403 });
    if (extname(path) && existsSync(file) && statSync(file).isFile()) {
      const type = TYPES[extname(path)];
      return new Response(Bun.file(file), type ? { headers: { "content-type": type } } : undefined);
    }
    const page = path === "/" ? INDEX : findPage(pages, path);
    const html = (body: string, state: unknown, status = 200) =>
      new Response(documentFor(page ?? INDEX, body, state, assets), {
        status,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    if (!page) {
      const { html: body, state } = renderToString(() => view`<main><h1>Página não encontrada</h1></main>`);
      return html(body, state, 404);
    }
    const { html: body, state } = renderToString(() => (page === INDEX ? siteIndex(pages) : renderPage(page)));
    return html(body, state);
  };
}
