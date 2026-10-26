import { expect, test } from "@playwright/test";

// SPRINT0 DoD 7: la portada carga y una ruta inexistente muestra el not-found.
test("la portada carga", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Eddie Store");
});

test("una ruta inexistente muestra la página 404", async ({ page }) => {
  const response = await page.goto("/no-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
});
