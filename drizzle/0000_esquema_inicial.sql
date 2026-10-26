CREATE TYPE "public"."appointment_status" AS ENUM('PENDIENTE', 'VENDIDA', 'CANCELADA', 'VENCIDA');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('COMPETICION', 'YOUTH');--> statement-breakpoint
CREATE TYPE "public"."engine_type" AS ENUM('4T', '2T');--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"access_token_hash" text NOT NULL,
	"motorcycle_id" uuid NOT NULL,
	"slot_start" timestamp with time zone NOT NULL,
	"slot_date" date NOT NULL,
	"full_name" text,
	"email" text,
	"phone_normalized" text,
	"ip_hmac" text,
	"financing" jsonb,
	"status" "appointment_status" DEFAULT 'PENDIENTE' NOT NULL,
	"updated_by" uuid,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_anonymized_ck" CHECK (("appointments"."anonymized_at" IS NULL AND "appointments"."full_name" IS NOT NULL AND "appointments"."email" IS NOT NULL AND "appointments"."phone_normalized" IS NOT NULL)
        OR ("appointments"."anonymized_at" IS NOT NULL AND "appointments"."full_name" IS NULL AND "appointments"."email" IS NULL AND "appointments"."phone_normalized" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "motorcycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"model_year" smallint NOT NULL,
	"engine_type" "engine_type" NOT NULL,
	"category" "category" NOT NULL,
	"displacement_cc" smallint NOT NULL,
	"price_cents" integer NOT NULL,
	"stock_total" integer DEFAULT 0 NOT NULL,
	"tagline" text NOT NULL,
	"badge" text,
	"card_specs" jsonb NOT NULL,
	"spec_groups" jsonb NOT NULL,
	"images" jsonb NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "motorcycles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "motorcycles_stock_total_ck" CHECK ("motorcycles"."stock_total" >= 0),
	CONSTRAINT "motorcycles_price_ck" CHECK ("motorcycles"."price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_motorcycle_id_motorcycles_id_fk" FOREIGN KEY ("motorcycle_id") REFERENCES "public"."motorcycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_updated_by_admin_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_slot_pending_uq" ON "appointments" USING btree ("slot_start") WHERE "appointments"."status" = 'PENDIENTE';--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_email_pending_uq" ON "appointments" USING btree ("email") WHERE "appointments"."status" = 'PENDIENTE';--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_phone_pending_uq" ON "appointments" USING btree ("phone_normalized") WHERE "appointments"."status" = 'PENDIENTE';--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_code_uq" ON "appointments" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_access_token_hash_uq" ON "appointments" USING btree ("access_token_hash");--> statement-breakpoint
CREATE INDEX "appointments_stock_idx" ON "appointments" USING btree ("motorcycle_id","status","slot_date");--> statement-breakpoint
CREATE INDEX "appointments_slot_date_idx" ON "appointments" USING btree ("slot_date");--> statement-breakpoint
CREATE INDEX "appointments_ip_pending_idx" ON "appointments" USING btree ("ip_hmac") WHERE "appointments"."status" = 'PENDIENTE';