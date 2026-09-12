// src/migrations/1725910000000-AddUsersAndIdPAuth.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersAndIdPAuth1725910000000 implements MigrationInterface {
    name = 'AddUsersAndIdPAuth1725910000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create user enums if not existing
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "user_role_enum" AS ENUM ('owner', 'admin', 'manager', 'cashier');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "user_status_enum" AS ENUM ('active', 'suspended', 'pending');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // 2. Create users table
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "users" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "auth_provider" character varying NOT NULL DEFAULT 'oidc',
                "auth_provider_user_id" character varying NOT NULL,
                "email" character varying NOT NULL,
                "name" character varying,
                "organization_id" uuid NOT NULL,
                "merchant_id" uuid,
                "role" "user_role_enum" NOT NULL DEFAULT 'admin',
                "permissions" text NOT NULL DEFAULT '*',
                "status" "user_status_enum" NOT NULL DEFAULT 'active',
                "metadata" jsonb DEFAULT '{}',
                "last_login_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "fk_users_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE
            );
        `);

        // 3. Create indices
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_provider_uid" ON "users" ("auth_provider", "auth_provider_user_id");
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_users_org_email" ON "users" ("organization_id", "email");
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_users_organization_id" ON "users" ("organization_id");
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_users_merchant_id" ON "users" ("merchant_id");
        `);

        // 4. Backfill existing merchants as initial organization owner users
        await queryRunner.query(`
            INSERT INTO "users" ("auth_provider", "auth_provider_user_id", "email", "name", "organization_id", "merchant_id", "role", "permissions", "status")
            SELECT 
                'legacy' AS "auth_provider",
                m."id"::text AS "auth_provider_user_id",
                m."email" AS "email",
                m."business_name" AS "name",
                m."organization_id" AS "organization_id",
                m."id" AS "merchant_id",
                'owner'::user_role_enum AS "role",
                '*' AS "permissions",
                'active'::user_status_enum AS "status"
            FROM "merchants" m
            WHERE m."organization_id" IS NOT NULL
            ON CONFLICT ("auth_provider", "auth_provider_user_id") DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum";`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum";`);
    }
}
