import { OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from "@nestjs/websockets";
import { AdmissionService } from "./admission.service";
import { MeetService } from "src/meet/meet.service";
import { OnModuleInit, UseFilters, UseGuards } from "@nestjs/common";
import { WsSessionGuard } from "src/auth/websocket-guard";
import { WebsocketExceptionsFilter } from "comon/filters/ws-execption-filter";
import { type CustomSocket } from "./dto/admission-socket";



@UseGuards(WsSessionGuard)
@UseFilters(WebsocketExceptionsFilter)
@WebSocketGateway(7001, { cors: { origin: 'http://localhost:5000', credentials: true } })
export class AdmissionGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    constructor(
        private readonly admissionService: AdmissionService,
        private readonly meetService: MeetService,
    ) {}


    async onModuleInit() {
        await this.admissionService.subscribeToAdmissionEvents()
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

            let meet = await this.meetService.getDetailsFromId(roomId);
            client.data.roomId = meet.id;
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
            await this.admissionService.removeUserFromWaitingList(roomId, userId)
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
        return this.admissionService.addUserToWaitingList(client, roomId, userId, userName, pfpUrl);
    }

}
