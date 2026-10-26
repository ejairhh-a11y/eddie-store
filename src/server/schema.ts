import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { CONSTRAINTS } from "./constraints";

// Modelo de datos de TECH-DESIGN.md. Dinero en céntimos (integer), nunca float.

export const engineType = pgEnum("engine_type", ["4T", "2T"]);
export const category = pgEnum("category", ["COMPETICION", "YOUTH"]);
export const appointmentStatus = pgEnum("appointment_status", [
  "PENDIENTE",
  "VENDIDA",
  "CANCELADA",
  "VENCIDA",
]);

export type SpecRow = { label: string; value: string };
export type SpecGroup = { title: string; rows: SpecRow[]; note?: string };
export type MotorcycleImage = { src: string; alt: string; width: number; height: number };
export type Financing = {
  downPaymentCents: number;
  termMonths: number;
  tinBps: number;
  installmentCents: number;
  taeBps: number;
};

export const motorcycles = pgTable(
  "motorcycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    modelYear: smallint("model_year").notNull(),
    engineType: engineType("engine_type").notNull(),
    category: category("category").notNull(),
    displacementCc: smallint("displacement_cc").notNull(),
    priceCents: integer("price_cents").notNull(),
    stockTotal: integer("stock_total").notNull().default(0),
    tagline: text("tagline").notNull(),
    badge: text("badge"),
    cardSpecs: jsonb("card_specs").$type<SpecRow[]>().notNull(),
    specGroups: jsonb("spec_groups").$type<SpecGroup[]>().notNull(),
    images: jsonb("images").$type<MotorcycleImage[]>().notNull(),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: smallint("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("motorcycles_stock_total_ck", sql`${t.stockTotal} >= 0`),
    check("motorcycles_price_ck", sql`${t.priceCents} > 0`),
  ],
);

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  sessionVersion: integer("session_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    accessTokenHash: text("access_token_hash").notNull(),
    motorcycleId: uuid("motorcycle_id")
      .notNull()
      .references(() => motorcycles.id),
    slotStart: timestamp("slot_start", { withTimezone: true }).notNull(),
    slotDate: date("slot_date").notNull(),
    fullName: text("full_name"),
    email: text("email"),
    phoneNormalized: text("phone_normalized"),
    ipHmac: text("ip_hmac"),
    financing: jsonb("financing").$type<Financing>(),
    status: appointmentStatus("status").notNull().default("PENDIENTE"),
    updatedBy: uuid("updated_by").references(() => adminUsers.id),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex(CONSTRAINTS.slotPending).on(t.slotStart).where(sql`${t.status} = 'PENDIENTE'`),
    uniqueIndex(CONSTRAINTS.emailPending).on(t.email).where(sql`${t.status} = 'PENDIENTE'`),
    uniqueIndex(CONSTRAINTS.phonePending).on(t.phoneNormalized).where(sql`${t.status} = 'PENDIENTE'`),
    uniqueIndex(CONSTRAINTS.code).on(t.code),
    uniqueIndex(CONSTRAINTS.accessTokenHash).on(t.accessTokenHash),
    index("appointments_stock_idx").on(t.motorcycleId, t.status, t.slotDate),
    index("appointments_slot_date_idx").on(t.slotDate),
    index("appointments_ip_pending_idx").on(t.ipHmac).where(sql`${t.status} = 'PENDIENTE'`),
    // Sin anonimizar: los tres datos personales presentes. Anonimizada: los tres en NULL (ADR 0015).
    check(
      "appointments_anonymized_ck",
      sql`(${t.anonymizedAt} IS NULL AND ${t.fullName} IS NOT NULL AND ${t.email} IS NOT NULL AND ${t.phoneNormalized} IS NOT NULL)
        OR (${t.anonymizedAt} IS NOT NULL AND ${t.fullName} IS NULL AND ${t.email} IS NULL AND ${t.phoneNormalized} IS NULL)`,
    ),
  ],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type Motorcycle = typeof motorcycles.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type AppointmentStatus = (typeof appointmentStatus.enumValues)[number];
