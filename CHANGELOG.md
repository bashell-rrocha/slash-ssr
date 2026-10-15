# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui, seguindo [Conventional Commits](https://www.conventionalcommits.org/) e [SemVer](https://semver.org/).

## [0.0.3] — 2026-10-15

Compatível com `@_bashell/slash` 0.0.6 (npm). O template roda fora do monorepo `slash-meta` só com o core publicado.

### Adicionado

- Pipeline de testes no GitHub Actions (`.github/workflows/test.yml`): em todo PR para `develop` ou `main` e no push na
  `main`, `bun install --frozen-lockfile`, `test`, `typecheck` e `test:e2e` (relatório do Playwright guardado quando
  falha). `bun.lock` versionado; o README explica como regerar.
- `PORT` validada (`src/port.ts`, inteiro de 1 a 65535; valor inválido encerra com erro em português); o servidor
  anuncia a porta real, e o Playwright usa a mesma `PORT`.
- README com os comandos.

### Alterado

- `@_bashell/slash` pela versão publicada (`^0.0.6`), não mais `workspace:*`; `@types/bun` fixo (1.4.3).
- `@playwright/test` declarado nas devDependencies (o `playwright.config.ts` o importa).

### Removido

- `bunfig.toml`, que só tinha um alias para o código do core no monorepo (nada o usava), e cabeçalhos de caminho
  antigos.

## [0.0.2] — 2026-10-08

Compatível com `@_bashell/slash` 0.0.3 (seguro por padrão).

### Segurança

- O estado da página vai para `<script type="application/json">` via `serializeStateForScript` (antes, `JSON.stringify` cru permitia fechar a tag `<script>`).

### Corrigido

- O app volta a ser reativo depois da hidratação (lista, adicionar/limpar, classe do botão).
- Build de produção: `index.html` com os assets com hash; o servidor lê `dist/index.html`.
- E2E novo (build + start) cobrindo SSR, hidratação e interações; o cliente marca `data-hydrated` ao terminar a hidratação.

### Removido

- Plugin de dev `resolve-slash-source` (morto).

## [0.0.1] — 2026-10-08

Primeira versão pública do `slash-ssr`.
