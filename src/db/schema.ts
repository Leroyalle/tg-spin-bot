import { bigint, timestamp, integer, pgTable, varchar, boolean } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';

export const moodEnum = pgEnum('mood', ['warm', 'calm', 'playful', 'neutral']);

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  userName: varchar({ length: 255 }),
  telegramId: bigint({ mode: 'number' }).notNull().unique(),
  lastSpinAt: timestamp({ withTimezone: false }),
});

export const giftsTable = pgTable('gifts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  reward: integer().notNull(),
  weight: integer().notNull(),
  coef: integer().notNull().default(1),
});

export const dailyTextsTable = pgTable('daily_texts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: varchar({ length: 500 }).notNull(),
  mood: moodEnum('mood').notNull(),
  isActive: boolean().default(true).notNull(),

  lastUsedAt: timestamp({ withTimezone: false }),
});

export type Gift = typeof giftsTable.$inferSelect;

export type User = typeof usersTable.$inferSelect;
