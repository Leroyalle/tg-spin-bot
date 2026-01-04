import { bigint } from 'drizzle-orm/pg-core';
import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  userName: varchar({ length: 255 }),
  telegramId: bigint({ mode: 'number' }).notNull().unique(),
});

export const giftsTable = pgTable('gifts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  reward: integer().notNull(),
  weight: integer().notNull(),
});

export type Gift = typeof giftsTable.$inferSelect;

export type User = typeof usersTable.$inferSelect;
