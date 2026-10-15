import { createHandler, readAssets } from "./server";

// Sobe o servidor do site de exemplo (dist/main.js, gerado pelo build). Uso: PORT=4403 bun run ui:serve
const dist = import.meta.dir;
const port = Number(process.env.PORT ?? 4403);
const server = Bun.serve({ port, fetch: createHandler(readAssets(dist), dist) });
console.log(`[ui:serve] http://localhost:${server.port}/`);
