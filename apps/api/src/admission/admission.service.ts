import { Injectable } from "@nestjs/common";
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from "ioredis";

@Injectable()
export class AdmissionService {
    private readonly redisClient: Redis | null;

    constructor(private readonly redisService: RedisService) {
        this.redisClient = this.redisService.getOrThrow("publisher");
    }

    public async addUserToWaitingList(roomId: string, userId: string, userName: string, pfp: string | null) {
        let doc = { [`user:${userId}`]: JSON.stringify({ status: "waiting", userName, pfp }) };
        await this.redisClient?.hset(`admission:${roomId}`, ...Object.entries(doc).flat());
        return true
    }

}
