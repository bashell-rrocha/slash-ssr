// packages/slash-ssr/src/state-script.ts
import { serializeStateForScript } from "@_bashell/slash/ssr";

// Bloco <script> com o estado serializado para hidratação no cliente (escapado para ser seguro dentro de <script>)
export function renderStateScript(state: unknown): string {
  return `
    <script id="__SLASH_STATE__" type="application/json">
      ${serializeStateForScript(state)}
    </script>`;
}
