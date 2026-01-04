import { bigint } from 'drizzle-orm/pg-core';
import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  telegramId: bigint({ mode: 'number' }).notNull().unique(),
});

export type User = typeof usersTable.$inferSelect;
