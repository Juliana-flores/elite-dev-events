import 'dotenv/config';
import * as pg from 'pg';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',

  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT ?? 5432),

  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,

  driver: pg,

  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
