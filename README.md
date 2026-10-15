# slash-ssr

Template de aplicação com renderização no servidor (SSR) sobre o [`@_bashell/slash`](https://www.npmjs.com/package/@_bashell/slash).

```sh
bun install
bun run dev        # desenvolvimento
bun run build      # build de produção em dist/
bun run start      # serve o dist/ (PORT, padrão 4000)
bun run test       # testes unitários
bun run typecheck  # checagem de tipos
bun run test:e2e   # e2e com Playwright (PORT, padrão 4000)
```

**Testes no GitHub:** todo PR para `develop` ou `main` e todo push na `main` rodam testes, checagem de tipos e e2e (`.github/workflows/test.yml`).
