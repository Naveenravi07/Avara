import { Injectable } from "@nestjs/common";
import { RedisService, DEFAULT_REDIS } from '@liaoliaots/nestjs-redis';
import { Redis } from "ioredis";

@Injectable()
export class AdmissionService {
    private readonly redisClient: Redis | null;

    constructor(private readonly redisService: RedisService) {
        this.redisClient = this.redisService.getOrThrow("publisher");
    }

    public async addUserToWaitingList(roomId: string, userId: string) {
        let doc = { [`user:${userId}`]: "waiting" };  // Key: userId, Value: status
        await this.redisClient?.hset(`admission:${roomId}`, ...Object.entries(doc).flat());
        return true
    }

}
