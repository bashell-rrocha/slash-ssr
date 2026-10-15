import { render } from "@_bashell/slash/core";
import { view } from "@_bashell/slash-ui/core";
import { exampleSite, findPage, registerServiceWorker, renderPage, siteIndex } from "@_bashell/slash-ui/host";

// Cliente do site de exemplo: monta de novo a página que o servidor renderizou (a hidratação do Slash refaz o
// conteúdo do #app) e registra o service worker do app. Cada página é um documento (sem roteador).
const pages = exampleSite();
const path = location.pathname;
const page = findPage(pages, path);
render(
  () => (page ? renderPage(page) : path === "/" ? siteIndex(pages) : view`<main><h1>Página não encontrada</h1></main>`),
  "#app",
);
document.documentElement.dataset.hydrated = "true";
registerServiceWorker("/app/sw.js", "/app/");
