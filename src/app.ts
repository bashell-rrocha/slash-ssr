// packages/slash-ssr/src/app.ts
import { html as clientHtml, createState } from "@_bashell/slash/core";
import { htmlString } from "@_bashell/slash/ssr";
import styles from "./styles.module.css";

// No servidor usa htmlString (retorna string), no cliente usa html (retorna Nodes)
const html = typeof document !== "undefined" ? clientHtml : htmlString;

type Todo = { id: number; text: string };

type AppState = {
  todos: Todo[];
  name: string;
  primary: boolean;
};

const state = createState<AppState>({
  todos: [
    {id:1, text: 'task 1'},
    {id:2, text: 'task 2'},
    {id:3, text: 'task 3'}
  ],
  name: "",
  primary: true,
});

let nextId = 4;

// Deriva um Reactive de uma parte do estado (o mesmo padrão do Tasks.tsx do slash-spa).
// Ler `state.get()` direto no template congela o valor na hora da montagem.
function select<T>(pick: (s: AppState) => T) {
  return {
    get: () => pick(state.get()),
    subscribe: (fn: (value: T) => void) => state.watch((s) => fn(pick(s))),
  };
}

const name = select((s) => s.name);
// A classe do botão deriva de `primary` (evita um watcher que faz state.set dentro da notificação)
const btnClasses = select((s) => [styles.button, s.primary ? styles.primary : styles.secondary]);
const todoItems = select((s) =>
  s.todos.map(
    (t: Todo) => html`
      <li class=${styles.todo}>
        <span>${t.text}</span>
        <button class=${styles.rm} onClick=${() => remove(t.id)}>x</button>
      </li>
    `,
  ),
);

function add() {
  const text = state.get().name.trim();
  if (!text) return;
  const newTodo: Todo = { id: nextId++, text };
  const prev = state.get();
  state.set({ ...prev, todos: [...prev.todos, newTodo], name: "" });
}

function remove(id: number) {
  const prev = state.get();
  state.set({ ...prev, todos: prev.todos.filter((t: Todo) => t.id !== id) });
}

export function App() {
  return html`
    <section>
      <div class=${styles.row}>
        <label>
          name:
          <input
            value=${name}
            onInput=${(e: Event) => {
              const prev = state.get();
              state.set({ ...prev, name: (e.target as HTMLInputElement).value });
            }}
          />
        </label>
        <button onClick=${add}>adicionar</button>
        <button onClick=${() => {
          const prev = state.get();
          state.set({ ...prev, todos: [] });
        }}>limpar</button>
      </div>

      <div class=${styles.row}>
        <button class=${btnClasses} onClick=${() => {
          const prev = state.get();
          state.set({ ...prev, primary: !prev.primary });
        }}>
          toggle primary
        </button>
      </div>

      <ul class=${styles.row}>
        ${todoItems}
      </ul>
    </section>
  `;
}
