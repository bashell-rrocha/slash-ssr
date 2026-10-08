import { test, expect } from "@playwright/test";

test.describe("SSR app (hidratação)", () => {
  test("todos funcionam após hidratar, sem erros de página", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(String(err)));

    // O HTML do servidor já traz os todos iniciais (antes de qualquer JS)
    const response = await page.request.get("/");
    const serverHtml = await response.text();
    expect(serverHtml).toContain("task 1");
    expect(serverHtml).toContain("task 3");

    await page.goto("/");
    // Os todos já estão no HTML do servidor: só interagir depois que o cliente hidratou
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const items = page.locator("ul li");
    await expect(items).toHaveCount(3);
    await expect(page.getByText("task 1")).toBeVisible();

    // adicionar
    await page.getByLabel("name:").fill("task 4");
    await page.getByRole("button", { name: "adicionar" }).click();
    await expect(items).toHaveCount(4);
    await expect(page.getByText("task 4")).toBeVisible();
    await expect(page.getByLabel("name:")).toHaveValue("");

    // remover
    await items.filter({ hasText: "task 2" }).getByRole("button", { name: "x" }).click();
    await expect(items).toHaveCount(3);
    await expect(page.getByText("task 2")).toHaveCount(0);

    // toggle primary
    const toggle = page.getByRole("button", { name: "toggle primary" });
    // CSS modules geram nomes com hash (primary_xxx / secondary_xxx)
    await expect(toggle).toHaveClass(/(^|\s)primary_/);
    await expect(toggle).not.toHaveClass(/(^|\s)secondary_/);
    await toggle.click();
    await expect(toggle).toHaveClass(/(^|\s)secondary_/);
    await expect(toggle).not.toHaveClass(/(^|\s)primary_/);
    await toggle.click();
    await expect(toggle).toHaveClass(/(^|\s)primary_/);
    await expect(toggle).not.toHaveClass(/(^|\s)secondary_/);

    // limpar
    await page.getByRole("button", { name: "limpar" }).click();
    await expect(items).toHaveCount(0);

    expect(pageErrors).toEqual([]);
  });
});
