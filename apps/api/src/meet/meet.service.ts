import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CreateMeet } from './dto/create-meet.dto';
import { DATABASE_CONNECTION } from '../../src/database/database-connection';
import * as schema from "./schema"
import { SessionUser } from '../../src/users/dto/session-user';
import { eq } from 'drizzle-orm';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class MeetService {
    private RedisService: Redis
    constructor(@Inject(DATABASE_CONNECTION)
    private readonly database: NodePgDatabase<typeof schema>,
        private userService: UsersService,
        private readonly redis: RedisService
    ) {
        this.RedisService = redis.getOrThrow("publisher")
    }

    async create(data: CreateMeet, user: SessionUser) {
        if (!user) throw new UnauthorizedException()
        const doc = await this.database.insert(schema.meetTable).values(data).returning()
        let roomId = doc[0]?.id
        if (!roomId) throw new Error("Room creation failed")
        return doc[0];
    }

    async getDetailsFromId(id: string) {
        const doc = await this.database.select().from(schema.meetTable).where(eq(schema.meetTable.id, id))
        if (!doc[0]) throw new NotFoundException("Meet dosent exists ")
        return doc[0];
    }

    async getAdmitRequests(roomId: string) {
        let users = await this.RedisService.hgetall(`admission:${roomId}`)
        let arr = Object.entries(users).map(([k, v]) => {
            type WaitingInfo = { status: string, userName: string, pfp: string | null, }
            let obj: WaitingInfo = JSON.parse(v)
                return {
                    userId: k.split("user:").at(1),
                    status: obj.status,
                    userName: obj.userName,
                    pfp: obj.pfp
                }
        }).filter((o)=>o.status != "admitted" && o.status != "rejected")
        return { roomId: roomId, waitingList: arr ?? [] }
    }

    async admitUserToMeet(roomId: string, userId: string) {
        let meet = await this.getDetailsFromId(roomId)
        let user = await this.userService.getUser(userId)

        let currDoc = await this.RedisService.hget(`admission:${roomId}`, `user:${userId}`)
        if (currDoc == null) {
            throw new UnauthorizedException()
        }
        type admissionInfo = { status: string, userName: string, pfp: string }
        let redis_data: admissionInfo = await JSON.parse(currDoc)

        redis_data.status = "admitted"
        await this.RedisService.hset(`admission:${roomId}`,`user:${userId}`,JSON.stringify(redis_data))

        let data = { userId: user.id, roomId: meet.id }
        let resp = await this.RedisService.publish("admitted-users", JSON.stringify(data))
        return resp
    }

    async rejectUserToMeet(roomId:string,userId:string){
        let meet = await this.getDetailsFromId(roomId)
        let user = await this.userService.getUser(userId)

        let currDoc = await this.RedisService.hget(`admission:${roomId}`, `user:${userId}`)
        if (currDoc == null) {
            throw new UnauthorizedException()
        }
        type admissionInfo = { status: string, userName: string, pfp: string }
        let redis_data: admissionInfo = await JSON.parse(currDoc)

        redis_data.status = "rejected"
        await this.RedisService.hset(`admission:${roomId}`,`user:${userId}`,JSON.stringify(redis_data))

        let data = { userId: user.id, roomId: meet.id }
        let resp = await this.RedisService.publish("rejected-users", JSON.stringify(data))
        return resp
    }
}
