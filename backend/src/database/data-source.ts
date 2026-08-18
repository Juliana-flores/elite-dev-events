import 'dotenv/config';
import * as pg from 'pg';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',

  url: process.env.DATABASE_URL,

  driver: pg,

  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});
