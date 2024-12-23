import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CreateMeet } from './dto/create-meet.dto';
import { UpdateMeetDto } from './dto/update-meet.dto';
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

        this.mediasoupService.addNewRoom(roomId, { id: user.id, name: user.name })
        return doc[0];
    }

    findOne(id: number) {
        return `This action returns a #${id} meet`;
    }

    update(id: number, updateMeetDto: UpdateMeetDto) {
        return `This action updates a #${id} meet`;
    }

    remove(id: number) {
        return `This action removes a #${id} meet`;
    }
}
