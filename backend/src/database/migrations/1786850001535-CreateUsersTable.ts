import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1786850001535 implements MigrationInterface {
  name = 'CreateUsersTable1786850001535';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('ORGANIZER', 'CUSTOMER', 'GATE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(120) NOT NULL,
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "role" "public"."users_role_enum" NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
