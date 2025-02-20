import { OnGatewayConnection, SubscribeMessage, WebSocketGateway, WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AdmissionService } from "./admission.service";
import { MeetService } from "src/meet/meet.service";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { Redis } from "ioredis";
import { UsersService } from "src/users/users.service";
import { NotFoundException, OnModuleInit, UseFilters, UseGuards } from "@nestjs/common";
import { WsSessionGuard } from "src/auth/websocket-guard";
import { WebsocketExceptionsFilter } from "comon/filters/ws-execption-filter";

interface ClientData {
    roomId: string;
    userId: string;
    userName: string
}

interface CustomSocket extends Socket {
    data: ClientData;
}


@UseGuards(WsSessionGuard)
@UseFilters(WebsocketExceptionsFilter)
@WebSocketGateway(7001, { cors: { origin: 'http://localhost:5000', credentials: true } })

export class AdmissionGateway implements OnGatewayConnection, OnModuleInit {
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
        try{
            console.log("[INFO] New Client Waiting On AdmissionService", client.id);
            const roomId = Array.isArray(client.handshake.query.roomId)
                ? client.handshake.query.roomId[0]
                : client.handshake.query.roomId?.toString();
    
            
            if(!roomId){
                throw new Error("HOI")
            }
    
            await this.meetService.getDetailsFromId(roomId);
            client.data.roomId = roomId;
        }catch(err){
            let errMsg = err instanceof Error ? err.message : "Some Error occured";
            client.emit("error", errMsg);
            client.disconnect()
        }
    }


    @SubscribeMessage("initialize")
    async initialize(client: CustomSocket) {
        console.log("Initialize = ", client.data)
        return true
    }


    @SubscribeMessage("waitingAdd")
    async handleWaitingAdd(client: CustomSocket) {
        let { roomId, userId } = client.data;

        let userData = await this.userService.getUser(userId);

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
