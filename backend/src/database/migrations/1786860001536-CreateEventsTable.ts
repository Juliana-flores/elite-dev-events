import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEventsTable1786860001536 implements MigrationInterface {
  name = 'CreateEventsTable1786860001536';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "organizer_id" uuid NOT NULL,
        "external_catalog_id" character varying NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "image_url" text,
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "location" character varying NOT NULL,
        "capacity" integer NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "status" "public"."event_status" NOT NULL DEFAULT 'DRAFT',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_events_capacity" CHECK ("capacity" > 0),
        CONSTRAINT "CHK_events_price" CHECK ("price" >= 0),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_events_organizer" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_status_starts_at" ON "events" ("status", "starts_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_organizer_id" ON "events" ("organizer_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_organizer_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_events_status_starts_at"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."event_status"`);
  }
}
