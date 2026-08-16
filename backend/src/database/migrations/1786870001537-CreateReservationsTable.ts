import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReservationsTable1786870001537 implements MigrationInterface {
  name = 'CreateReservationsTable1786870001537';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."reservation_status" AS ENUM('PENDING_PAYMENT', 'PAID', 'PAYMENT_FAILED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "reservations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "customer_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unit_price" numeric(10,2) NOT NULL,
        "total_amount" numeric(12,2) NOT NULL,
        "status" "public"."reservation_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_reservations_quantity" CHECK ("quantity" > 0),
        CONSTRAINT "CHK_reservations_unit_price" CHECK ("unit_price" >= 0),
        CONSTRAINT "CHK_reservations_total_amount" CHECK ("total_amount" >= 0),
        CONSTRAINT "PK_reservations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_reservations_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_reservations_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reservations_customer_id" ON "reservations" ("customer_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reservations_event_id" ON "reservations" ("event_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_reservations_status" ON "reservations" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reservations_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_reservations_event_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_reservations_customer_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "reservations"`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."reservation_status"`,
    );
  }
}
