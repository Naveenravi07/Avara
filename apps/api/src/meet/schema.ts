import { uuid, pgTable, varchar,  timestamp } from 'drizzle-orm/pg-core';

export const meetTable = pgTable('meet', {
  id: uuid().primaryKey().defaultRandom(),
  creator: varchar({ length: 40 }).notNull(),
  createdAt: timestamp().defaultNow(),
});

