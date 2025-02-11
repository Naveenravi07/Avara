import { relations } from 'drizzle-orm';
import { uuid, pgTable,  timestamp } from 'drizzle-orm/pg-core';
import { usersTable } from '../../src/users/schema';

export const meetTable = pgTable('meet', {
    id: uuid().primaryKey().defaultRandom(),
    creator: uuid().notNull().references(()=>usersTable.id),
    createdAt: timestamp().defaultNow(),
});

export const meetRelations = relations(meetTable, ({ one }) => ({
    creatorInfo: one(usersTable, {
        fields: [meetTable.creator],
        references: [usersTable.id]
    })
}))
