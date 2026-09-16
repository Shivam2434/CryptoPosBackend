// src/migrations/1725930000000-AddPlatformAdminRbacAndInvitations.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlatformAdminRbacAndInvitations1725930000000 implements MigrationInterface {
  name = 'AddPlatformAdminRbacAndInvitations1725930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Extend user_role_enum with super_admin and sub_admin
    await queryRunner.query(`
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'super_admin';
        `);
    await queryRunner.query(`
            ALTER TYPE "user_role_enum" ADD VALUE IF NOT EXISTS 'sub_admin';
        `);

    // 2. Create admin enums if not existing
    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "admin_scope_level_enum" AS ENUM ('PLATFORM', 'ORGANIZATION', 'MERCHANT', 'LOCATION', 'DEVICE');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "invitation_status_enum" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

    // 3. Alter users table to support platform admins and scopes
    await queryRunner.query(`
            ALTER TABLE "users" 
                ALTER COLUMN "organization_id" DROP NOT NULL,
                ADD COLUMN IF NOT EXISTS "scope_level" "admin_scope_level_enum" NOT NULL DEFAULT 'ORGANIZATION',
                ADD COLUMN IF NOT EXISTS "scoped_organization_ids" text NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS "scoped_merchant_ids" text NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS "is_platform_admin" boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS "invited_by_user_id" character varying,
                ADD COLUMN IF NOT EXISTS "invitation_id" uuid;
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_users_is_platform_admin" ON "users" ("is_platform_admin");
        `);

    // 4. Alter audit_logs to allow nullable organization_id for platform actions
    await queryRunner.query(`
            ALTER TABLE "audit_logs" ALTER COLUMN "organization_id" DROP NOT NULL;
        `);

    // 5. Create roles table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "roles" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "name" character varying UNIQUE NOT NULL,
                "description" character varying,
                "is_system" boolean NOT NULL DEFAULT false,
                "permissions" text NOT NULL DEFAULT '*',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_roles_name" ON "roles" ("name");
        `);

    // 6. Create admin_invitations table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "admin_invitations" (
                "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                "email" character varying NOT NULL,
                "invited_by_user_id" character varying NOT NULL,
                "role_id" character varying NOT NULL,
                "permissions" text NOT NULL DEFAULT '*',
                "scope_level" "admin_scope_level_enum" NOT NULL DEFAULT 'ORGANIZATION',
                "scoped_organization_ids" text NOT NULL DEFAULT '',
                "scoped_merchant_ids" text NOT NULL DEFAULT '',
                "token_hash" character varying NOT NULL,
                "status" "invitation_status_enum" NOT NULL DEFAULT 'PENDING',
                "expires_at" TIMESTAMP NOT NULL,
                "accepted_at" TIMESTAMP,
                "accepted_by_user_id" uuid,
                "revoked_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now()
            );
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_admin_invitations_token_hash" ON "admin_invitations" ("token_hash");
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_admin_invitations_email" ON "admin_invitations" ("email");
        `);
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_admin_invitations_status" ON "admin_invitations" ("status");
        `);

    // 7. Seed system predefined roles
    await queryRunner.query(`
            INSERT INTO "roles" ("name", "description", "is_system", "permissions")
            VALUES 
                ('SUPER_ADMIN', 'Unrestricted platform administrative access', true, '*'),
                ('OPERATIONS_ADMIN', 'Platform operations and merchant management', true, 'organizations.*,merchants.*,locations.*,devices.*,payments.*,settlements.*,wallets.*,analytics.*'),
                ('SUPPORT_ADMIN', 'Merchant support and transaction troubleshooting', true, 'organizations.read,merchants.read,locations.read,devices.read,payments.read,payments.refund,settlements.read,analytics.read'),
                ('COMPLIANCE_ADMIN', 'Compliance, auditing, and financial monitoring', true, 'organizations.read,merchants.read,payments.read,settlements.read,audit_logs.read,analytics.read')
            ON CONFLICT ("name") DO NOTHING;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_invitations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "invitation_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "admin_scope_level_enum";`);
    await queryRunner.query(`
            ALTER TABLE "users" 
                DROP COLUMN IF EXISTS "invitation_id",
                DROP COLUMN IF EXISTS "invited_by_user_id",
                DROP COLUMN IF EXISTS "is_platform_admin",
                DROP COLUMN IF EXISTS "scoped_merchant_ids",
                DROP COLUMN IF EXISTS "scoped_organization_ids",
                DROP COLUMN IF EXISTS "scope_level";
        `);
  }
}
