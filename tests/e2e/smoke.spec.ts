import { expect, test } from "@playwright/test";

// SPRINT0 DoD 7, actualizado en el BACKLOG #6: la portada ya no es el placeholder del Sprint 0
// sino el catálogo (CONTRATO-06 v1, changelog).
test("la portada carga", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Gama Yamaha YZ 2025");
});

test("una ruta inexistente muestra la página 404", async ({ page }) => {
  const response = await page.goto("/no-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Página no encontrada" })).toBeVisible();
});
