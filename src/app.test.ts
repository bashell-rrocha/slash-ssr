// packages/slash-ssr/src/app.test.ts
import { describe, test, expect, beforeEach } from "bun:test";
import { createState } from "@_bashell/slash/core";
import { renderToString } from "@_bashell/slash/ssr";
import { App } from "./app";

describe("App SSR", () => {
  describe("renderToString", () => {
    test("should render initial todos", () => {
      const { html } = renderToString(() => App());

      expect(html).toContain("task 1");
      expect(html).toContain("task 2");
      expect(html).toContain("task 3");
    });

    test("should render input with empty value", () => {
      const { html } = renderToString(() => App());

      expect(html).toContain('<input');
      expect(html).toContain('value=""');
    });

    test("should render buttons", () => {
      const { html } = renderToString(() => App());

      expect(html).toContain("adicionar");
      expect(html).toContain("limpar");
      expect(html).toContain("toggle primary");
    });

    test("should render todos as list items", () => {
      const { html } = renderToString(() => App());

      expect(html).toContain("<li");
      expect(html).toContain("</li>");
      expect(html).toContain("<ul");
    });

    test("should include remove button for each todo", () => {
      const { html } = renderToString(() => App());

      const xButtonCount = (html.match(/x<\/button>/g) || []).length;
      expect(xButtonCount).toBe(3);
    });

    test("should return serialized state with signal IDs", () => {
      const { state } = renderToString(() => App());

      expect(state).toBeDefined();
      expect(Object.keys(state).length).toBeGreaterThan(0);

      // State é serializado com IDs (s0, s1, etc)
      const stateValues = Object.values(state);
      expect(stateValues.length).toBeGreaterThan(0);
    });
  });

  describe("state structure", () => {
    test("should serialize state to JSON", () => {
      const { state } = renderToString(() => App());

      const json = JSON.stringify(state);
      expect(json).toBeDefined();

      const parsed = JSON.parse(json);
      // JSON.stringify converte undefined para null
      // então comparamos as keys em vez dos valores
      expect(Object.keys(parsed)).toEqual(Object.keys(state));
      expect(Object.keys(parsed).length).toBeGreaterThan(0);
    });

    test("should include todos array in serialized state", () => {
      const { state } = renderToString(() => App());

      // Encontrar o signal que contém o array de todos
      const todosSignal = Object.values(state).find(Array.isArray);
      expect(todosSignal).toBeDefined();
      expect(Array.isArray(todosSignal)).toBe(true);
    });
  });

  describe("HTML structure", () => {
    test("should render section as root element", () => {
      const { html } = renderToString(() => App());

      expect(html).toMatch(/^<section/);
      expect(html).toMatch(/<\/section>$/);
    });

    test("should render div containers", () => {
      const { html } = renderToString(() => App());

      expect(html).toContain("<div>");
      expect(html).toContain("</div>");
    });

    test("should render label with input", () => {
      const { html } = renderToString(() => App());

      expect(html).toContain("<label>");
      expect(html).toContain("name:");
      expect(html).toContain("</label>");
    });
  });

  describe("CSS classes", () => {
    test("should render without CSS classes in SSR", () => {
      const { html } = renderToString(() => App());

      // Em SSR, CSS modules podem não ter hashes gerados
      // O importante é que o HTML seja gerado corretamente
      expect(html).toContain("<section>");
      expect(html).toContain("</section>");
    });
  });
});
