// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";
import { parsePort } from "./src/port";

// Porta do servidor de teste: PORT no ambiente, 4000 por padrão (valor inválido é recusado)
const PORT = parsePort(process.env.PORT);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Os arquivos E2E usam o sufixo .e2e.ts
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // Fluxo de produção: o build gera nomes com hash e reescreve o index.html
    command: "bun run build && bun run start",
    url: BASE_URL,
    env: { PORT: String(PORT) },
    reuseExistingServer: false,
    timeout: 120000,
  },
});
