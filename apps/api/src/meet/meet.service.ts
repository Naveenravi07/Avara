import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CreateMeet } from './dto/create-meet.dto';
import { DATABASE_CONNECTION } from '../../src/database/database-connection';
import * as schema from "./schema"
import { SessionUser } from '../../src/users/dto/session-user';
import { eq } from 'drizzle-orm';

@Injectable()
export class MeetService {
    constructor(@Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    ) { }

    async create(data: CreateMeet, user: SessionUser) {
        if (!user) throw new UnauthorizedException()
        const doc = await this.database.insert(schema.meetTable).values(data).returning()
        let roomId = doc[0]?.id
        if (!roomId) throw new Error("Room creation failed")
        return doc[0];
    }

    async getDetailsFromId(id: string) {
        const doc = await this.database.select().from(schema.meetTable).where(eq(schema.meetTable.id, id))
        if (!doc[0]) throw new Error("Meet dosent exists ")
        return doc[0];
    }
}
