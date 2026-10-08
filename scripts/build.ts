// packages/slash-ssr/scripts/build.ts
import { cssModuleTypesPlugin } from "../plugins/css-types";
import { resolve, basename } from "node:path";
import { cp, rm, mkdir, readFile, writeFile } from "node:fs/promises";

type BuildConfig = Parameters<typeof Bun.build>[0];

const ROOT = resolve(import.meta.dir, "..");
const DIST = resolve(ROOT, "dist");
const PUBLIC = resolve(ROOT, "public");
const SRC = resolve(ROOT, "src");

// Limpar dist/
console.log("[build] Cleaning dist/...");
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

// Build do cliente
const clientConfig = {
  entrypoints: [resolve(SRC, "client.ts")],
  outdir: DIST,
  splitting: true,
  sourcemap: "external",
  minify: true,
  format: "esm",
  packages: "bundle",
  naming: {
    entry: "[dir]/[name]-[hash].[ext]",
    chunk: "[dir]/[name]-[hash].[ext]",
    asset: "[dir]/[name]-[hash].[ext]",
  },
  plugins: [cssModuleTypesPlugin({ verbose: false })],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __DEV__: "false",
  },
} satisfies BuildConfig;

console.log("[build] Building client for production...");
const startTimeClient = performance.now();
const clientResult = await Bun.build(clientConfig);

if (!clientResult.success) {
  console.error("[build] ❌ Client build failed:");
  for (const log of clientResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

const elapsedClient = (performance.now() - startTimeClient).toFixed(0);
const clientSize = clientResult.outputs.reduce((sum, o) => sum + (o.size || 0), 0);
const clientSizeKB = (clientSize / 1024).toFixed(1);

console.log(`[build] ✓ Client built in ${elapsedClient}ms (${clientSizeKB}KB total)`);

// Build do servidor
const serverConfig = {
  entrypoints: [resolve(SRC, "server.ts")],
  outdir: DIST,
  target: "bun",
  format: "esm",
  sourcemap: "external",
  minify: false, // servidor não precisa minificar
  packages: "bundle",
  plugins: [cssModuleTypesPlugin({ verbose: false })],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __DEV__: "false",
  },
} satisfies BuildConfig;

console.log("[build] Building server for production...");
const startTimeServer = performance.now();
const serverResult = await Bun.build(serverConfig);

if (!serverResult.success) {
  console.error("[build] ❌ Server build failed:");
  for (const log of serverResult.logs) {
    console.error(log);
  }
  process.exit(1);
}

const elapsedServer = (performance.now() - startTimeServer).toFixed(0);
const serverSize = serverResult.outputs.reduce((sum, o) => sum + (o.size || 0), 0);
const serverSizeKB = (serverSize / 1024).toFixed(1);

console.log(`[build] ✓ Server built in ${elapsedServer}ms (${serverSizeKB}KB total)`);

// Copiar arquivos estáticos de public/ para dist/
console.log("[build] Copying static files from public/ to dist/...");
await cp(PUBLIC, DIST, { recursive: true, force: true });

// O build gera nomes com hash: reescrever o index.html (template do SSR) com os arquivos reais do cliente
const entryJs = clientResult.outputs.find((o) => o.kind === "entry-point");
if (!entryJs) {
  console.error("[build] ❌ Client entry point output not found");
  process.exit(1);
}
const cssLinks = clientResult.outputs
  .filter((o) => o.path.endsWith(".css"))
  .map((o) => `<link rel="stylesheet" href="/${basename(o.path)}">`)
  .join("");
let indexHtml = await readFile(resolve(DIST, "index.html"), "utf8");
if (!indexHtml.includes("/client.js")) {
  console.error('[build] ❌ index.html não referencia "/client.js"; não há o que reescrever');
  process.exit(1);
}
indexHtml = indexHtml.replace("/client.js", () => `/${basename(entryJs.path)}`);
if (cssLinks) {
  if (!indexHtml.includes("</head>")) {
    console.error("[build] ❌ index.html não tem </head>; não há onde injetar o CSS");
    process.exit(1);
  }
  indexHtml = indexHtml.replace("</head>", () => `${cssLinks}\n  </head>`);
}
await writeFile(resolve(DIST, "index.html"), indexHtml, "utf8");

console.log("[build] ✓ Static files copied to dist/");

const totalTime = (performance.now() - startTimeClient).toFixed(0);
console.log(`[build] ✓ Total build time: ${totalTime}ms`);

// Listar arquivos gerados
console.log("\n[build] Generated files:");
for (const output of [...clientResult.outputs, ...serverResult.outputs]) {
  const path = output.path.replace(process.cwd(), ".");
  const sizeKB = ((output.size || 0) / 1024).toFixed(1);
  console.log(`  - ${path} (${sizeKB}KB)`);
}
