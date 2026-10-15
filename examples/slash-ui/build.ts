import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { EXAMPLE_APP, exampleSite, serviceWorkerSource, webManifest } from "@_bashell/slash-ui/host";
import { copyHostAssets, themeColors } from "@_bashell/slash-ui/host/node";
import { cssModuleTypesPlugin } from "../../plugins/css-types";

// Build do site de exemplo do slash-ui no slash-ssr: cliente (browser) e servidor (bun) no mesmo processo, como o
// template (as classes dos CSS Modules saem iguais nos dois), o CSS dos temas com as fontes, os ícones e o PWA.
// Uso: bun run ui:build   (saída em examples/slash-ui/dist/; o servidor é dist/main.js)

const ROOT = import.meta.dir;
const DIST = join(ROOT, "dist");
const pages = exampleSite();
const define = (server: boolean) => ({
  __DEV__: "false",
  __SERVER__: String(server),
  "process.env.NODE_ENV": JSON.stringify("production"),
});

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
const client = await Bun.build({
  entrypoints: [join(ROOT, "src", "client.ts")],
  outdir: DIST,
  target: "browser",
  format: "esm",
  splitting: true,
  minify: true,
  naming: "[name]-[hash].[ext]",
  define: define(false),
  plugins: [cssModuleTypesPlugin({ verbose: false })],
});
const server = await Bun.build({
  entrypoints: [join(ROOT, "src", "main.ts"), join(ROOT, "src", "server.ts")],
  outdir: DIST,
  target: "bun",
  format: "esm",
  naming: "[name].[ext]",
  define: define(true),
  plugins: [cssModuleTypesPlugin({ verbose: false })],
});
for (const result of [client, server]) {
  if (!result.success) {
    console.error(result.logs.map((log) => log.message).join("\n"));
    process.exit(1);
  }
}
// O CSS do servidor é o mesmo do cliente: só o do cliente vai para a página
for (const output of server.outputs) if (output.path.endsWith(".css")) rmSync(output.path, { force: true });
const entry = client.outputs.find((o) => o.kind === "entry-point");
if (!entry) throw new Error("o bundle do cliente não gerou o JS de entrada");
const css = client.outputs.filter((o) => o.path.endsWith(".css")).map((o) => `/${relative(DIST, o.path)}`);

copyHostAssets(DIST, [...new Set(pages.map((p) => p.theme))]);
const colors = themeColors(EXAMPLE_APP.theme);
writeFileSync(
  join(DIST, "assets.json"),
  JSON.stringify({ js: `/${relative(DIST, entry.path)}`, css, themeColor: colors.theme }, null, 2),
);
const manifest = webManifest({ ...EXAMPLE_APP, themeColor: colors.theme, backgroundColor: colors.background, icons: "/app/icons/" });
writeFileSync(join(DIST, "app", "manifest.webmanifest"), JSON.stringify(manifest, null, 2));
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [`/${relative(DIST, path)}`];
  });
const assets = files(DIST).filter(
  (file) =>
    /^\/(client|chunk)-[\w-]+\.(css|js)$/.test(file) ||
    file === "/themes/dist/base.css" ||
    file === `/themes/dist/${EXAMPLE_APP.theme}.css` ||
    file.startsWith(`/themes/${EXAMPLE_APP.theme}/fonts/`) ||
    file.startsWith("/app/icons/"),
);
const precache = [...pages.filter((p) => p.app).map((p) => p.path), ...assets];
writeFileSync(join(DIST, "app", "sw.js"), serviceWorkerSource({ precache, scope: EXAMPLE_APP.startUrl }));
console.log(`[ui:build] cliente e servidor em ${relative(process.cwd(), DIST)}/, ${precache.length} no pré-cache`);
