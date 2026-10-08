// packages/slash-ssr/src/client.ts
import { render } from "@_bashell/slash/core";
import { App } from "./app";

// Logs úteis apenas em desenvolvimento
if (__DEV__) {
  console.log("[DEV] App iniciando em modo desenvolvimento");
  console.log("[DEV] Ambiente:", process.env.NODE_ENV);

  // Verificar se há estado do servidor
  const stateEl = document.getElementById("__SLASH_STATE__");
  if (stateEl) {
    console.log("[DEV] Estado inicial do servidor:", JSON.parse(stateEl.textContent!));
  }

  // Verificar se há conteúdo para hidratar
  const app = document.getElementById("app");
  console.log("[DEV] App tem conteúdo?", app?.childNodes.length, "nodes");
  console.log("[DEV] Tem __SLASH_STATE__?", !!stateEl);
}

// render() detecta automaticamente se deve hidratar (SSR) ou renderizar do zero
// Se existe conteúdo no #app + script __SLASH_STATE__, vai hidratar
// Senão, vai renderizar normalmente
render(() => App(), "#app");

if (__DEV__) {
  console.log("[DEV] App inicializado!");
}
