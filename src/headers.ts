// src/headers.ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Núcleo puro do arquivo `_headers` (sintaxe Cloudflare Pages/Netlify): caminho sem recuo, cabeçalhos recuados.
export type Header = [name: string, value: string];
export type HeaderRule = { path: string; headers: Header[] };

export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  let current: HeaderRule | null = null;
  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === "" || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      current = { path: raw.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    const sep = raw.indexOf(":");
    if (!current || sep < 0) continue;
    const name = raw.slice(0, sep).trim();
    const value = raw.slice(sep + 1).trim();
    if (name && value) current.headers.push([name, value]);
  }
  return rules;
}

function pathRegExp(path: string): RegExp {
  const source = path
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${source}$`);
}

// Cabeçalhos de todos os blocos que casam com o caminho; o mesmo nome em dois blocos é unido com vírgula
export function matchHeaders(rules: HeaderRule[], pathname: string): Header[] {
  const merged = new Map<string, Header>();
  for (const rule of rules) {
    if (!pathRegExp(rule.path).test(pathname)) continue;
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      const prev = merged.get(key);
      merged.set(key, prev ? [prev[0], `${prev[1]}, ${value}`] : [name, value]);
    }
  }
  return [...merged.values()];
}

// Aplica sem sobrescrever o que a resposta já define
export function applyHeaders(res: Response, headers: Header[]): Response {
  if (!headers.length) return res;
  const out = new Headers(res.headers);
  for (const [name, value] of headers) {
    try {
      if (!out.has(name)) out.set(name, value);
    } catch {
      // nome ou valor inválido: ignora este cabeçalho
    }
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
}

// Lê o primeiro `_headers` que existir nas pastas (dist/ primeiro, depois public/); sem arquivo, sem regras
export async function loadHeaderRules(dirs: string[]): Promise<HeaderRule[]> {
  for (const dir of dirs) {
    try {
      return parseHeaders(await readFile(join(dir, "_headers"), "utf8"));
    } catch {
      // sem _headers nesta pasta: tenta a próxima
    }
  }
  return [];
}
