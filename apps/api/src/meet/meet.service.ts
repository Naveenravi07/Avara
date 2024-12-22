import { Inject, Injectable } from '@nestjs/common';
import type { CreateMeet } from './dto/create-meet.dto';
import { UpdateMeetDto } from './dto/update-meet.dto';
import { DATABASE_CONNECTION } from 'src/database/database-connection';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from "./schema"

@Injectable()
export class MeetService {
    constructor(@Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
    ) { }

    async create(data: CreateMeet) {
        const doc = await this.database.insert(schema.meetTable).values(data).returning()
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
