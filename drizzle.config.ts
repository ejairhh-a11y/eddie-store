import { defineConfig } from "drizzle-kit";

// Las migraciones usan siempre la conexión directa, nunca la del pooler (ADR 0016).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? "",
  },
});
