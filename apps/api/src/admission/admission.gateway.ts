import { OnGatewayConnection, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AdmissionService } from "./admission.service";
import { MeetService } from "src/meet/meet.service";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { Redis } from "ioredis";
import { UsersService } from "src/users/users.service";
import { OnModuleInit } from "@nestjs/common";


@WebSocketGateway(7001, { cors: { origin: '*' } })
export class AdmissionGateway implements OnGatewayConnection, OnModuleInit {
    private pubClient: Redis
    private subClient: Redis
    private waitingUsers: Map<String, Array<Socket>> = new Map()

    constructor(
        private readonly admissionService: AdmissionService,
        private readonly meetService: MeetService,
        private readonly userService: UsersService,
        private readonly redis: RedisService
    ) {
        this.pubClient = redis.getOrThrow("publisher")
        this.subClient = redis.getOrThrow("subscriber")
    }

    onModuleInit() {
        this.subClient.on('message', async (ch, msg) => {

            if (ch == "admitted-users") {
                let { roomId, userId }: { roomId: string, userId: string } = await JSON.parse(msg)
                let room = this.waitingUsers.get(roomId)
                let client = room?.find((obj) => obj.data.userId == userId)
                client?.emit("admission-approval", "Ok")

            } else if (ch == "rejected-users") {
                let { roomId, userId }: { roomId: string, userId: string } = await JSON.parse(msg)
                let room = this.waitingUsers.get(roomId)
                let client = room?.find((obj) => obj.data.userId == userId)
                client?.emit("admission-rejected", "Ok")
            }
        })

        this.subClient.subscribe("admitted-users")
        this.subClient.subscribe("rejected-users")
    }

    handleConnection(client: Socket) {
        console.log("[INFO] New Client Waiting On AdmissionService", client.id)
    }


    @SubscribeMessage("initialize")
    async initialize(client: Socket, payload: any) {
        try {
            await this.meetService.getDetailsFromId(payload.roomId)
        } catch (e) { return false }
        client.data.userId = payload.userId;
        client.data.roomId = payload.roomId;
        return true
    }

    @SubscribeMessage("waitingAdd")
    async handleWaitingAdd(client: Socket) {
        let { roomId, userId }: { roomId: string, userId: string } = client.data;
        if (!roomId || !userId) {
            throw new Error("RoomId/UserId not found");
        }
        let userData = await this.userService.getUser(userId);
        let meetData = await this.meetService.getDetailsFromId(roomId);

        let data = { userId, roomId, userName: userData.name, pfp: userData.pfpUrl };
        let status = await this.admissionService.addUserToWaitingList(roomId, userId, data.userName, data.pfp);
        await this.pubClient.publish("user-waiting", JSON.stringify(data));

        let cursocks = this.waitingUsers.get(roomId) || [];

        let existingIndex = cursocks.findIndex((obj) => obj.data.userId === userId);

        if (existingIndex !== -1) {
            cursocks[existingIndex] = client;
        } else {
            cursocks.push(client);
        }
        this.waitingUsers.set(roomId, cursocks);
        return status;
    }


}
