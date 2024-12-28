import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CreateMeet } from './dto/create-meet.dto';
import { DATABASE_CONNECTION } from 'src/database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from "./schema"
import { MediasoupService } from 'src/mediasoup/mediasoup.service';
import { SessionUser } from 'src/users/dto/session-user';

@Injectable()
export class MeetService {
    constructor(@Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
        private readonly mediasoupService: MediasoupService
    ) { }

    async create(data: CreateMeet, user: SessionUser) {
        if (!user) throw new UnauthorizedException()
        const doc = await this.database.insert(schema.meetTable).values(data).returning()
        let roomId = doc[0]?.id
        if (!roomId) throw new Error("Room creation failed")
        await this.mediasoupService.addNewRoom(roomId)
        return doc[0];
    }

}
