// src/migrations/1725920000000-CreateWalletsAndReceivingAddresses.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWalletsAndReceivingAddresses1725920000000 implements MigrationInterface {
  name = 'CreateWalletsAndReceivingAddresses1725920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create wallet enums if not existing
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "wallet_type_enum" AS ENUM ('EXTERNAL', 'PLATFORM_GENERATED', 'CUSTODIAL');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "wallet_status_enum" AS ENUM ('active', 'inactive', 'archived');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // 2. Create wallets table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "wallets" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "organization_id" uuid NOT NULL,
                "merchant_id" uuid,
                "location_id" uuid,
                "address" character varying NOT NULL,
                "network" character varying NOT NULL DEFAULT 'mainnet',
                "asset" character varying NOT NULL,
                "type" "wallet_type_enum" NOT NULL DEFAULT 'EXTERNAL',
                "status" "wallet_status_enum" NOT NULL DEFAULT 'active',
                "is_primary" boolean NOT NULL DEFAULT true,
                "label" character varying,
                "metadata" jsonb DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_wallets_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_wallets_merchant" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE SET NULL,
                CONSTRAINT "fk_wallets_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL
            );
        `);

    // 3. Create indices for fast payment address resolution and tenant isolation
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_wallets_org_asset_net_status" ON "wallets" ("organization_id", "asset", "network", "status");
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_wallets_org_loc_asset_net" ON "wallets" ("organization_id", "location_id", "asset", "network");
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_wallets_org_address" ON "wallets" ("organization_id", "address");
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_wallets_organization_id" ON "wallets" ("organization_id");
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_wallets_merchant_id" ON "wallets" ("merchant_id");
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_wallets_location_id" ON "wallets" ("location_id");
        `);

    // 4. Backfill existing merchant static addresses into wallets table as active primary external wallets
    await queryRunner.query(`
            INSERT INTO "wallets" ("organization_id", "merchant_id", "address", "network", "asset", "type", "status", "is_primary", "label")
            SELECT 
                m."organization_id",
                m."id",
                m."eth_wallet_address",
                'mainnet',
                'ETH',
                'EXTERNAL'::wallet_type_enum,
                'active'::wallet_status_enum,
                true,
                'Merchant Primary ETH Wallet'
            FROM "merchants" m
            WHERE m."organization_id" IS NOT NULL 
              AND m."eth_wallet_address" IS NOT NULL 
              AND m."eth_wallet_address" <> '';

            INSERT INTO "wallets" ("organization_id", "merchant_id", "address", "network", "asset", "type", "status", "is_primary", "label")
            SELECT 
                m."organization_id",
                m."id",
                m."btc_wallet_address",
                'mainnet',
                'BTC',
                'EXTERNAL'::wallet_type_enum,
                'active'::wallet_status_enum,
                true,
                'Merchant Primary BTC Wallet'
            FROM "merchants" m
            WHERE m."organization_id" IS NOT NULL 
              AND m."btc_wallet_address" IS NOT NULL 
              AND m."btc_wallet_address" <> '';

            INSERT INTO "wallets" ("organization_id", "merchant_id", "address", "network", "asset", "type", "status", "is_primary", "label")
            SELECT 
                m."organization_id",
                m."id",
                m."usdt_wallet_address",
                'mainnet',
                'USDT_ERC20',
                'EXTERNAL'::wallet_type_enum,
                'active'::wallet_status_enum,
                true,
                'Merchant Primary USDT Wallet'
            FROM "merchants" m
            WHERE m."organization_id" IS NOT NULL 
              AND m."usdt_wallet_address" IS NOT NULL 
              AND m."usdt_wallet_address" <> '';
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "wallets";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "wallet_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "wallet_type_enum";`);
  }
}
