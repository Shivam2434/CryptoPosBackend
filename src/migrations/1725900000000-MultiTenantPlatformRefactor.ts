// src/migrations/1725900000000-MultiTenantPlatformRefactor.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class MultiTenantPlatformRefactor1725900000000 implements MigrationInterface {
    name = 'MultiTenantPlatformRefactor1725900000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create organizations table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "organizations" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "name" character varying NOT NULL,
                "slug" character varying NOT NULL UNIQUE,
                "status" character varying NOT NULL DEFAULT 'active',
                "default_currency" character varying NOT NULL DEFAULT 'AUD',
                "settlement_preference" character varying NOT NULL DEFAULT 'crypto',
                "settings" jsonb DEFAULT '{}',
                "billing_email" character varying,
                "support_email" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);

        // 2. Create locations table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "locations" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "merchant_id" uuid,
                "name" character varying NOT NULL,
                "code" character varying,
                "address" character varying,
                "city" character varying,
                "state" character varying,
                "postcode" character varying,
                "timezone" character varying NOT NULL DEFAULT 'Australia/Sydney',
                "status" character varying NOT NULL DEFAULT 'active',
                "metadata" jsonb DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_locations_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
            );
        `);

        // 3. Create devices table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "devices" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "location_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "device_code" character varying NOT NULL UNIQUE,
                "token_hash" character varying,
                "status" character varying NOT NULL DEFAULT 'pending_pairing',
                "last_seen_at" TIMESTAMP,
                "metadata" jsonb DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_devices_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_devices_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE
            );
        `);

        // 4. Create api_keys table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "api_keys" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "key_prefix" character varying NOT NULL,
                "key_hash" character varying NOT NULL UNIQUE,
                "key_type" character varying NOT NULL DEFAULT 'secret',
                "environment" character varying NOT NULL DEFAULT 'live',
                "scopes" text NOT NULL DEFAULT '*',
                "last_used_at" TIMESTAMP,
                "expires_at" TIMESTAMP,
                "revoked_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_api_keys_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
            );
        `);

        // 5. Create webhook_endpoints table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "url" character varying NOT NULL,
                "secret" character varying NOT NULL,
                "events" text NOT NULL DEFAULT '*',
                "status" character varying NOT NULL DEFAULT 'active',
                "description" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_webhook_endpoints_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
            );
        `);

        // 6. Create webhook_deliveries table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "endpoint_id" uuid NOT NULL,
                "event_type" character varying NOT NULL,
                "payload" jsonb NOT NULL,
                "signature" character varying,
                "status" character varying NOT NULL DEFAULT 'pending',
                "attempts" integer NOT NULL DEFAULT 0,
                "max_attempts" integer NOT NULL DEFAULT 5,
                "next_retry_at" TIMESTAMP,
                "http_status_code" integer,
                "response_body" text,
                "error" character varying,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "delivered_at" TIMESTAMP,
                CONSTRAINT "fk_webhook_deliveries_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_webhook_deliveries_endpoint" FOREIGN KEY ("endpoint_id") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE
            );
        `);

        // 7. Create audit_logs table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "audit_logs" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "actor_type" character varying NOT NULL DEFAULT 'user',
                "actor_id" character varying,
                "action" character varying NOT NULL,
                "resource_type" character varying NOT NULL,
                "resource_id" character varying,
                "ip_address" character varying,
                "user_agent" character varying,
                "details" jsonb DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);

        // 8. Alter merchants table
        await queryRunner.query(`
            ALTER TABLE "merchants" 
            ADD COLUMN IF NOT EXISTS "organization_id" uuid;
        `);

        // 9. Alter payments table
        await queryRunner.query(`
            ALTER TABLE "payments" 
            ADD COLUMN IF NOT EXISTS "organization_id" uuid,
            ADD COLUMN IF NOT EXISTS "location_id" uuid,
            ADD COLUMN IF NOT EXISTS "device_id" uuid,
            ADD COLUMN IF NOT EXISTS "integration_id" character varying,
            ADD COLUMN IF NOT EXISTS "network" character varying NOT NULL DEFAULT 'mainnet',
            ADD COLUMN IF NOT EXISTS "environment" character varying NOT NULL DEFAULT 'live',
            ADD COLUMN IF NOT EXISTS "idempotency_key" character varying,
            ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS "last_checked_at" TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "settlement_id" uuid;
        `);

        // 10. Alter settlements table
        await queryRunner.query(`
            ALTER TABLE "settlements" 
            ADD COLUMN IF NOT EXISTS "organization_id" uuid,
            ADD COLUMN IF NOT EXISTS "location_id" uuid,
            ADD COLUMN IF NOT EXISTS "fee_aud_amount" decimal(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "net_aud_amount" decimal(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS "payout_provider" character varying DEFAULT 'manual_bank',
            ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP,
            ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP DEFAULT now();
        `);

        // 11. Create Compound Indexes
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_payments_org_created" ON "payments" ("organization_id", "created_at");
            CREATE INDEX IF NOT EXISTS "idx_payments_org_status" ON "payments" ("organization_id", "status");
            CREATE INDEX IF NOT EXISTS "idx_payments_org_location" ON "payments" ("organization_id", "location_id");
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_payments_org_idempotency" ON "payments" ("organization_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
            CREATE INDEX IF NOT EXISTS "idx_audit_org_created" ON "audit_logs" ("organization_id", "created_at");
            CREATE INDEX IF NOT EXISTS "idx_deliveries_org_created" ON "webhook_deliveries" ("organization_id", "created_at");
        `);

        // 12. Auto-migrate existing merchants into default organizations if any exist
        await queryRunner.query(`
            DO $$
            DECLARE
                m RECORD;
                new_org_id uuid;
                org_slug varchar;
            BEGIN
                FOR m IN SELECT id, business_name, email, settlement_preference FROM "merchants" WHERE organization_id IS NULL LOOP
                    org_slug := lower(regexp_replace(COALESCE(m.business_name, 'merchant'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6);
                    
                    INSERT INTO "organizations" ("name", "slug", "status", "default_currency", "settlement_preference", "billing_email", "settings")
                    VALUES (COALESCE(m.business_name, 'Default Org'), org_slug, 'active', 'AUD', COALESCE(m.settlement_preference, 'crypto'), m.email, '{}')
                    RETURNING id INTO new_org_id;

                    UPDATE "merchants" SET "organization_id" = new_org_id WHERE "id" = m.id;
                    UPDATE "payments" SET "organization_id" = new_org_id WHERE "merchant_id" = m.id AND "organization_id" IS NULL;
                    UPDATE "settlements" SET "organization_id" = new_org_id WHERE "merchant_id" = m.id AND "organization_id" IS NULL;
                END LOOP;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "webhook_deliveries" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "webhook_endpoints" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "api_keys" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "devices" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "locations" CASCADE;`);
        await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE;`);
    }
}
