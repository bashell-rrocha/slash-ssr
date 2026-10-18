# slash-ssr

Template de aplicação com renderização no servidor (SSR) sobre o [`@_bashell/slash`](https://www.npmjs.com/package/@_bashell/slash).

```sh
bun install
bun run dev        # desenvolvimento
bun run build      # build de produção em dist/
bun run start      # serve o dist/ (PORT: inteiro de 1 a 65535, padrão 4000)
bun run test       # testes unitários
bun run typecheck  # checagem de tipos
bun run test:e2e   # e2e com Playwright (PORT, padrão 4000)
```

**Cabeçalhos de segurança:** `public/_headers` (sintaxe Cloudflare Pages/Netlify: CSP, nosniff, Referrer-Policy, X-Frame-Options) vale na hospedagem estática e também no servidor do template, que o lê na subida e o aplica em toda resposta, 404 inclusive (sem sobrescrever o que a rota já define).

**Testes no GitHub:** todo PR para `develop` ou `main` e todo push na `main` rodam testes, checagem de tipos e e2e (`.github/workflows/test.yml`).

### `bun.lock`

O `bun.lock` versionado é o do template fora do monorepo (é ele que o CI e os projetos derivados usam). Dentro do
`slash-meta` o bun usa o lock da raiz e ignora este, então ele **não** se atualiza sozinho: mudou dependência no
`package.json`, gere o lock numa cópia limpa fora do monorepo e traga de volta (sem isso o CI falha no
`--frozen-lockfile`):

```sh
tmp=$(mktemp -d) && git archive HEAD | tar -x -C "$tmp"   # ou copie os arquivos versionados com a mudança
cp package.json "$tmp/" && (cd "$tmp" && rm -f bun.lock && bun install) && cp "$tmp/bun.lock" . && rm -rf "$tmp"
```

Num projeto criado do template (fora do monorepo), basta `bun install` (ou `bun update`) como sempre.
