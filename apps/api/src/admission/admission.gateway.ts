import { OnGatewayConnection, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { AdmissionService } from "./admission.service";
import { MeetService } from "src/meet/meet.service";
import { RedisService } from "@liaoliaots/nestjs-redis";
import { Redis } from "ioredis";
import { UsersService } from "src/users/users.service";


@WebSocketGateway(7001, { cors: { origin: '*' } })
export class AdmissionGateway implements OnGatewayConnection {
    private pubClient: Redis


    constructor(
        private readonly admissionService: AdmissionService,
        private readonly meetService: MeetService,
        private readonly userService: UsersService,
        private readonly redis: RedisService
    ) {
        this.pubClient = redis.getOrThrow("publisher")
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
        let { roomId, userId }: { roomId: string, userId: string } = client.data
        if (!roomId || !userId) {
            throw new Error("RoomId/UserId not found")
        }
        let userData = await this.userService.getUser(userId)
        let meetData = await this.meetService.getDetailsFromId(roomId)
        let data = { userId, roomId, userName: userData.name, pfp: userData.pfpUrl }

        let status = await this.admissionService.addUserToWaitingList(roomId, userId, data.userName, data.pfp)
        let result = await this.pubClient.publish("user-waiting", JSON.stringify(data))
        return status
    }


}
