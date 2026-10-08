// packages/slash-ssr/scripts/dev.ts
import { cssModuleTypesPlugin } from "../plugins/css-types";
import { watch as fsWatch } from "node:fs";
import { stat, readdir, writeFile, cp, rm, mkdir } from "node:fs/promises";
import { resolve, join, extname, basename } from "node:path";
import type { BunPlugin } from "bun";

type BuildConfig = Parameters<typeof Bun.build>[0];

// Plugin para resolver "slash" para o código fonte TypeScript em desenvolvimento
const resolveSlashSourcePlugin: BunPlugin = {
  name: "resolve-slash-source",
  setup(build) {
    build.onResolve({ filter: /^slash$/ }, () => {
      return {
        path: resolve(import.meta.dir, "../../slash/src/index.ts"),
      };
    });
  },
};

const ROOT = resolve(import.meta.dir, "..");
const DIST = resolve(ROOT, "dist");
const PUBLIC = resolve(ROOT, "public");
const SRC = resolve(ROOT, "src");
const MANIFEST = join(DIST, ".css-dev.json");

const clientConfig = {
  entrypoints: [resolve(SRC, "client.ts")],
  outdir: DIST,
  splitting: true,
  sourcemap: "inline",
  minify: false,
  format: "esm",
  naming: {
    entry: "[dir]/[name].[ext]",
    chunk: "[dir]/[name].[ext]",
    asset: "[dir]/[name].[ext]",
  },
  packages: "bundle",
  // Não usar external - bundlar tudo incluindo slash
  plugins: [resolveSlashSourcePlugin, cssModuleTypesPlugin({ verbose: true })],
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    __DEV__: "true",
  },
} satisfies BuildConfig;

const serverConfig = {
  entrypoints: [resolve(SRC, "server.ts")],
  outdir: DIST,
  target: "bun",
  format: "esm",
  sourcemap: "inline",
  minify: false,
  packages: "bundle",
  // Não usar external - bundlar tudo incluindo slash
  plugins: [resolveSlashSourcePlugin, cssModuleTypesPlugin({ verbose: false })],
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    __DEV__: "true",
  },
} satisfies BuildConfig;

// extensões que disparam rebuild (ignora .d.ts)
const VALID_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

// Inicializar dist/ e copiar arquivos estáticos
console.log("[dev] Initializing dist/...");
await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });
await cp(PUBLIC, DIST, { recursive: true });

let serverProcess: any = null;

await buildOnce("initial");
await startServer();

// watcher: macOS/Win usa recursive, Linux cai em polling
if (supportsRecursiveWatch()) {
  console.log("[dev] watching (fs.watch recursive)");
  const w = fsWatch(SRC, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    const full = join(SRC, filename.toString());
    if (!isWatchedFile(full)) return;
    void handleChange(`change ${filename}`);
  });
  process.on("SIGINT", async () => {
    w.close();
    await stopServer();
    process.exit(0);
  });
} else {
  console.log("[dev] watching (polling)");
  const mtimes = new Map<string, number>();
  const tick = async () => {
    for await (const file of walk(SRC)) {
      if (!isWatchedFile(file)) continue;
      try {
        const m = (await stat(file)).mtimeMs;
        const prev = mtimes.get(file) ?? 0;
        if (m !== prev) {
          mtimes.set(file, m);
          await handleChange(`change ${file}`);
        }
      } catch {}
    }
    // limpa deletados
    for (const f of Array.from(mtimes.keys())) {
      try {
        await stat(f);
      } catch {
        mtimes.delete(f);
      }
    }
  };
  const interval = setInterval(tick, 800);
  process.on("SIGINT", async () => {
    clearInterval(interval);
    await stopServer();
    process.exit(0);
  });
}

/* ---------------- utils ---------------- */

function supportsRecursiveWatch() {
  return process.platform === "darwin" || process.platform === "win32";
}

function isWatchedFile(path: string) {
  const ext = extname(path).toLowerCase();
  if (ext === ".d.ts") return false;
  return VALID_EXT.has(ext);
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function buildOnce(tag: string) {
  const startTime = performance.now();

  // Build cliente
  const clientResult = await Bun.build(clientConfig);
  if (!clientResult.success) {
    console.error(`[dev] ❌ Client build failed ${tag ? `(${tag})` : ""}:`);
    for (const log of clientResult.logs) {
      console.error(log);
    }
    return false;
  }

  await writeCssManifestFromOutputs(clientResult?.outputs ?? []);

  // Build servidor
  const serverResult = await Bun.build(serverConfig);
  if (!serverResult.success) {
    console.error(`[dev] ❌ Server build failed ${tag ? `(${tag})` : ""}:`);
    for (const log of serverResult.logs) {
      console.error(log);
    }
    return false;
  }

  // Copiar arquivos estáticos
  if (tag !== "initial") {
    await cp(PUBLIC, DIST, { recursive: true, force: true });
  }

  const elapsed = (performance.now() - startTime).toFixed(0);
  const clientSize = clientResult.outputs.reduce((sum, o) => sum + (o.size || 0), 0);
  const serverSize = serverResult.outputs.reduce((sum, o) => sum + (o.size || 0), 0);
  const totalSizeKB = ((clientSize + serverSize) / 1024).toFixed(1);

  console.log(`[dev] ✓ built ${tag ? `(${tag})` : ""} in ${elapsed}ms (${totalSizeKB}KB)`);

  if (tag === "initial") {
    for (const output of [...clientResult.outputs, ...serverResult.outputs]) {
      const name = basename(output.path);
      const size = ((output.size || 0) / 1024).toFixed(1);
      console.log(`  - ${name} (${size}KB)`);
    }
  }

  return true;
}

async function writeCssManifestFromOutputs(outputs: any[]) {
  const cssFiles = outputs
    .map((o) => String(o?.path || ""))
    .filter((p) => p.endsWith(".css"))
    .map((p) => basename(p));

  const payload = JSON.stringify({ css: cssFiles }, null, 2);
  try {
    const current = await Bun.file(MANIFEST).text();
    if (current === payload) return;
  } catch {}
  await writeFile(MANIFEST, payload, "utf8");
}

async function startServer() {
  const serverPath = resolve(DIST, "server.js");
  const bunPath = process.execPath || "bun";
  console.log("[dev] Starting server...");
  serverProcess = Bun.spawn([bunPath, serverPath], {
    stdout: "inherit",
    stderr: "inherit",
  });
}

async function stopServer() {
  if (serverProcess) {
    console.log("[dev] Stopping server...");
    serverProcess.kill();
    serverProcess = null;
  }
}

async function handleChange(tag: string) {
  await stopServer();
  const success = await buildOnce(tag);
  if (success) {
    await startServer();
  }
}
