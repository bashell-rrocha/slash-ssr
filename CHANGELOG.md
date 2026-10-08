# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui, seguindo [Conventional Commits](https://www.conventionalcommits.org/) e [SemVer](https://semver.org/).

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
