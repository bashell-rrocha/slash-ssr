# Hospedeiro de exemplo do slash-ui (slash-ssr)

As telas de exemplo do `@_bashell/slash-ui` renderizadas no servidor a cada requisição e hidratadas no cliente:
as 4 landings e o app Sereno (cada estado e cada lembrete), como PWA. É a prova de nível 3 do kit: as mesmas
páginas rodam iguais em slash-ssg, slash-spa e slash-ssr (`bun run test:hosts` no `slash-ui`).

- `bun run ui:build`: cliente e servidor no mesmo processo (as classes dos CSS Modules saem iguais nos dois), CSS
  dos temas com as fontes, ícones, manifest e service worker do app.
- `PORT=4403 bun run ui:serve`: sobe `dist/main.js`.

O servidor (`src/server.ts`, `createHandler`) não guarda nada entre requisições além da lista de páginas e dos nomes
do build, que são só leitura: o estado reativo nasce dentro dos componentes, por requisição.
