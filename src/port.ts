// src/port.ts
// Porta do servidor a partir de process.env.PORT.

export const DEFAULT_PORT = 4000;

// Ausente ou vazia usa o padrão; qualquer outro valor precisa ser um inteiro entre 1 e 65535.
export function parsePort(raw: string | undefined, fallback: number = DEFAULT_PORT): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = raw.trim();
  const port = Number(value);
  if (!/^\d+$/.test(value) || port < 1 || port > 65535) {
    throw new Error(`PORT inválida: "${raw}" (use um número inteiro entre 1 e 65535)`);
  }
  return port;
}
