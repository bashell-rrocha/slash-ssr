// packages/slash-ssr/src/server.ts
import { renderToString } from "@_bashell/slash/ssr";
import { App } from "./app";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const DIST = new URL("../dist/", import.meta.url);
const PUBLIC_DIR = new URL("../public/", import.meta.url);

// Ler o template HTML
async function getHtmlTemplate(): Promise<string> {
  const templatePath = resolve(import.meta.dir, "../public/index.html");
  return await readFile(templatePath, "utf-8");
}

// Injetar CSS no HTML
function injectCss(html: string, cssFiles: string[]): string {
  if (!cssFiles.length) return html;
  const links = cssFiles
    .map((name) => `<link rel="stylesheet" href="/${name}">`)
    .join("\n    ");

  if (html.includes("</head>")) {
    return html.replace("</head>", `    ${links}\n  </head>`);
  }
  return links + html;
}

// Renderizar a página com SSR
async function serveIndex(): Promise<Response> {
  // Renderizar o App com SSR
  const { html: appHtml, state } = renderToString(() => App());

  // Ler o template HTML
  let html = await getHtmlTemplate();

  // Ler manifest de CSS (gerado em dev mode)
  try {
    const manifestPath = resolve(import.meta.dir, "../dist/.css-dev.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
    html = injectCss(html, manifest.css || []);
  } catch {
    // Em produção ou se não houver manifest, tentar injetar client.css diretamente
    html = injectCss(html, ["client.css"]);
  }

  // Substituir o placeholder pelo HTML renderizado
  html = html.replace('<div id="app">carregando…</div>', `<div id="app">${appHtml}</div>`);

  // Injetar o estado serializado
  const stateScript = `
    <script id="__SLASH_STATE__" type="application/json">
      ${JSON.stringify(state)}
    </script>`;

  html = html.replace("</body>", `  ${stateScript}\n  </body>`);

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

Bun.serve({
  port: 4000,
  async fetch(req) {
    const url = new URL(req.url);

    // Servir a página principal com SSR
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return serveIndex();
    }

    // Servir arquivos estáticos de dist/
    try {
      const fileUrl = new URL("." + url.pathname, DIST);
      const file = Bun.file(fileUrl);
      if (await file.exists()) {
        return new Response(file);
      }
    } catch {}

    // Servir arquivos estáticos de public/ (fallback)
    try {
      const fileUrl = new URL("." + url.pathname, PUBLIC_DIR);
      const file = Bun.file(fileUrl);
      if (await file.exists()) {
        return new Response(file);
      }
    } catch {}

    return new Response("Not found", { status: 404 });
  },
});

console.log("▶ http://localhost:4000 (SSR enabled)");
