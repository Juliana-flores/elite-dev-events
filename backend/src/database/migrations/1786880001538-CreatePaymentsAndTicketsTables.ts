import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentsAndTicketsTables1786880001538 implements MigrationInterface {
  name = 'CreatePaymentsAndTicketsTables1786880001538';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'APPROVED', 'DECLINED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."ticket_status" AS ENUM('VALID', 'USED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reservation_id" uuid NOT NULL,
        "amount" numeric(12,2) NOT NULL,
        "status" "public"."payment_status" NOT NULL DEFAULT 'PENDING',
        "provider" character varying NOT NULL DEFAULT 'FAKE',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_payments_amount" CHECK ("amount" >= 0),
        CONSTRAINT "PK_payments_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_reservation_id" UNIQUE ("reservation_id"),
        CONSTRAINT "FK_payments_reservation" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status")`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "tickets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reservation_id" uuid NOT NULL,
        "event_id" uuid NOT NULL,
        "customer_id" uuid NOT NULL,
        "secure_code" character varying NOT NULL,
        "share_token" character varying NOT NULL,
        "status" "public"."ticket_status" NOT NULL DEFAULT 'VALID',
        "validated_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tickets_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tickets_secure_code" UNIQUE ("secure_code"),
        CONSTRAINT "UQ_tickets_share_token" UNIQUE ("share_token"),
        CONSTRAINT "FK_tickets_reservation" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tickets_event" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_tickets_customer" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tickets_reservation_id" ON "tickets" ("reservation_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tickets_event_id" ON "tickets" ("event_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tickets_customer_id" ON "tickets" ("customer_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tickets_status" ON "tickets" ("status")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_customer_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tickets_event_id"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_tickets_reservation_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "tickets"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payments_status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."ticket_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payment_status"`);
  }
}
