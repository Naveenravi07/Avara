import { Injectable, NotFoundException } from "@nestjs/common";
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from "ioredis";
import { CustomSocket } from "./dto/admission-socket";
import { AdmissionUser } from "./dto/admission-user";

@Injectable()
export class AdmissionService {
    private readonly pubClient: Redis
    private readonly subClient: Redis
    private waitingUsers: Map<String, Array<CustomSocket>> = new Map()

    constructor(private readonly redis: RedisService) {
        this.pubClient = redis.getOrThrow("publisher")
        this.subClient = redis.getOrThrow("subscriber")
    }

    public async subscribeToAdmissionEvents() {
        this.subClient.on('message', async (ch, msg) => {

            switch (ch) {
                case "admitted-users": {
                    let { roomId, userId }: { roomId: string, userId: string } = await JSON.parse(msg)
                    let room = this.waitingUsers.get(roomId)
                    let client = room?.find((obj) => obj.data.userId == userId)
                    client?.emit("admission-approval", "Ok")
                    break;
                }

                case "rejected-users": {
                    let { roomId, userId }: { roomId: string, userId: string } = await JSON.parse(msg)
                    let room = this.waitingUsers.get(roomId)
                    let client = room?.find((obj) => obj.data.userId == userId)
                    client?.emit("admission-rejected", "Ok")

                    this.removeUserFromWaitingList(roomId, userId)
                    break
                }

                default: break;
            }
        })

        this.subClient.subscribe("admitted-users")
        this.subClient.subscribe("rejected-users")
    }



    public async addUserToWaitingList(
        client: CustomSocket,
        roomId: string,
        userId: string,
        userName: string,
        pfp: string | null
    ) {
        let data = { userId, roomId, userName, pfp };
        await this.pubClient.hset(`admission:${roomId}`, `user:${userId}`, JSON.stringify({ status: "waiting", userName, pfp }));
        await this.pubClient.publish("user-waiting", JSON.stringify(data));

        let users = this.waitingUsers.get(roomId) || [];
        let index = users.findIndex((obj) => obj.data.userId === userId);

        if (index !== -1) {
            users[index] = client;
        } else {
            users.push(client);
        }

        this.waitingUsers.set(roomId, users);
        return true;
    }



    public async removeUserFromWaitingList(roomId: string, userId: string) {
        let users = this.waitingUsers.get(roomId) || [];
        this.waitingUsers.set(roomId, users.filter((user) => user.data.userId !== userId));
        let data = await this.pubClient.hget(`admission:${roomId}`, `user:${userId}`);

        //
        // We dont delete admitted users history from redis. This is to let them rejoin Without waiting for permission again
        //

        if (data && JSON.parse(data).status !== "admitted") {
            await this.pubClient.hdel(`admission:${roomId}`, `user:${userId}`);
        }
    }

    public async getWaitingUserFromRedis(roomId:string,userId:string){
        let data = await this.pubClient.hget(`admission:${roomId}`, `user:${userId}`);
        if (!data) return null
        let userData : AdmissionUser = JSON.parse(data)
        return userData
    }

}
