import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AdmissionService } from "./admission.service";
import { MeetService } from "src/meet/meet.service";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { Redis } from "ioredis";
import { UsersService } from "src/users/users.service";
import { OnModuleInit, UseFilters, UseGuards } from "@nestjs/common";
import { WsSessionGuard } from "src/auth/websocket-guard";
import { WebsocketExceptionsFilter } from "comon/filters/ws-execption-filter";

interface ClientData {
    roomId: string;
    userId: string;
    userName: string,
    pfpUrl: string | null
}

interface CustomSocket extends Socket {
    data: ClientData;
}


@UseGuards(WsSessionGuard)
@UseFilters(WebsocketExceptionsFilter)
@WebSocketGateway(7001, { cors: { origin: 'http://localhost:5000', credentials: true } })

export class AdmissionGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    private pubClient: Redis
    private subClient: Redis
    private waitingUsers: Map<String, Array<CustomSocket>> = new Map()

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

    async handleConnection(client: CustomSocket) {
        // Use try catch in handleConnection and other hooks
        // Filter doesnt work here
        try {
            console.log("[INFO] New Client Waiting On AdmissionService", client.id);
            const roomId = Array.isArray(client.handshake.query.roomId)
                ? client.handshake.query.roomId[0]
                : client.handshake.query.roomId?.toString();


            if (!roomId) {
                throw new Error("Please provide a roomId in query")
            }

            await this.meetService.getDetailsFromId(roomId);
            client.data.roomId = roomId;
        } catch (err) {
            let errMsg = err instanceof Error ? err.message : "Some Error occured";
            client.emit("error", errMsg);
            client.disconnect()
        }
    }

    async handleDisconnect(client: CustomSocket) {
        try {
            console.log("Client on Admission service disconnected", client.id)
            let { roomId, userId } = client.data
            let str = await this.pubClient.hget(`admission:${roomId}`, `user:${userId}`)
            if (!str) return
            let data = JSON.parse(str)
            if (data.status == "waiting") {
                await this.pubClient.hdel(`admission:${roomId}`, `user:${userId}`)
            }
            let cursocks = this.waitingUsers.get(roomId)
            let filterd_socks = cursocks?.filter((obj) => obj.data.userId !== userId)
            this.waitingUsers.set(roomId, filterd_socks ?? [])
        } catch (_) {

        }
    }


    @SubscribeMessage("initialize")
    async initialize(client: CustomSocket) {
        console.log("Initialize = ", client.data)
        return true
    }


    @SubscribeMessage("waitingAdd")
    async handleWaitingAdd(client: CustomSocket) {
        let { roomId, userId, pfpUrl, userName } = client.data;
        let data = { userId, roomId, userName: userName, pfp: pfpUrl };
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
