import { expect, test } from "@playwright/test";

// TECH-DESIGN F1 [E] y F2 [E] (BACKLOG #6, #7, #8). Datos: catálogo de la migración 0001.

test.describe("catálogo", () => {
  test("lista los 6 modelos con precio en formato es-ES y estado de stock", async ({ page }) => {
    await page.goto("/");
    const cards = page.locator("#catalogo article");
    await expect(cards).toHaveCount(6);
    await expect(cards.first()).toContainText("10.499 €");
    await expect(page.locator("#catalogo")).toContainText("4.899 €");
    await expect(cards.filter({ hasText: "Yamaha YZ65" }).getByTestId("stock-badge")).toHaveText(/Agotada/);
  });

  test("filtra por tipo con la URL y muestra el estado vacío", async ({ page }) => {
    await page.goto("/?tipo=4t");
    await expect(page.locator("#catalogo article")).toHaveCount(2);
    await page.goto("/?tipo=4t&cc=125");
    await expect(page.getByText("Ningún modelo coincide")).toBeVisible();
    await page.getByRole("link", { name: "Quitar filtros" }).click();
    await expect(page.locator("#catalogo article")).toHaveCount(6);
  });

  test("no muestra secciones fuera de alcance ni textos de pago", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    for (const text of ["Accesorios", "Concesionario &amp; Taller", "Comparar", "Cross-Country", "0% TAE", "encriptada", "Envío"]) {
      expect(html).not.toContain(text);
    }
  });
});

test.describe("ficha", () => {
  test("muestra precio, stock y especificaciones, y lleva a la cita", async ({ page }) => {
    await page.goto("/motos/yz450f");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Yamaha YZ450F/i);
    await expect(page.getByTestId("price")).toHaveText("10.499 €");
    await expect(page.getByRole("table")).toHaveCount(3);
    await expect(page.getByRole("main").getByRole("link", { name: "Agendar cita", exact: true })).toHaveAttribute("href", "/cita?moto=yz450f");
  });

  test("una moto agotada no deja agendar y sugiere similares", async ({ page }) => {
    await page.goto("/motos/yz65");
    await expect(page.getByRole("main").getByRole("link", { name: "Agendar cita", exact: true })).toHaveCount(0);
    await expect(page.getByText("Este modelo está agotado")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Modelos similares con stock" })).toBeVisible();
  });

  test("un modelo inexistente devuelve 404", async ({ page }) => {
    const response = await page.goto("/motos/no-existe");
    expect(response?.status()).toBe(404);
  });
});

test.describe("simulador", () => {
  test("calcula la cuota, la TAE y pasa los datos a la cita", async ({ page }) => {
    await page.goto("/financiacion?moto=yz450f&entrada=2000&plazo=36");
    await expect(page.getByTestId("cuota")).toContainText("258,36 €");
    await expect(page.getByTestId("tae")).toHaveText("6,11 %");
    await page.getByText("60 meses").click();
    await expect(page.getByTestId("cuota")).toContainText("164,11 €");
    await expect(page.getByRole("link", { name: "Agendar cita con esta moto" })).toHaveAttribute(
      "href",
      "/cita?moto=yz450f&entrada=2000&plazo=60",
    );
  });

  test("un plazo inválido en la URL vuelve a 36 meses", async ({ page }) => {
    await page.goto("/financiacion?moto=yz450f&entrada=2000&plazo=12");
    await expect(page.getByTestId("cuota")).toContainText("258,36 €");
  });
});
