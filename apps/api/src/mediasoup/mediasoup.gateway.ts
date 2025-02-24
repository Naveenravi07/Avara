import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { MediasoupService } from './mediasoup.service';
import { MeetService } from 'src/meet/meet.service';
import { OnModuleInit, UseFilters, UseGuards } from '@nestjs/common';
import { WsSessionGuard } from 'src/auth/websocket-guard';
import { WebsocketExceptionsFilter } from 'comon/filters/ws-execption-filter';
import { type CustomSocket } from 'src/admission/dto/admission-socket';
import { initializeMeetingReqSchema, type InitializeMeet } from './dto/initialize-meeting';
import { ZodValidationPipe } from 'comon/pipes/zodValidationPipe';
import { createTransportReqSchema, type CreateTrasnsportReq } from './dto/create-transport-req';
import { type TransportConnectReq, transportConnectReqSchema } from './dto/transport-connect-req';
import { type TransportProduceReq, transportProduceReqSchema } from './dto/transport-produce-req';
import { type TransportConsumeReq, transportConsumeReqSchema } from './dto/transport-cnsume-req';
import { type ResumeConsumeTransportReq, resumeConsumeTransportReqSchema } from './dto/resume-consume-transport-req';
import { type ConsumeSingleUserReq, consumeSingleUserReqSchema } from './dto/consume-single-user-req';
import { type CloseProducerReq, closeProducerReqSchema } from './dto/close-producer-req';
import { AdmissionService } from 'src/admission/admission.service';
import { clear } from 'console';


@UseGuards(WsSessionGuard)
@UseFilters(WebsocketExceptionsFilter)
@WebSocketGateway(7000, { cors: { origin: 'http://localhost:5000', credentials: true } })
export class MediasoupGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {

    constructor(
        private readonly MediasoupService: MediasoupService,
        private readonly meetService: MeetService,
        private readonly admissionService: AdmissionService,
    ) { }

    async onModuleInit() {
        await this.MediasoupService.subscribeToMessages()
    }

    handleConnection(client: CustomSocket) {
        console.log("New conenction req", client.id)
    }

    async handleDisconnect(client: CustomSocket) {
        try {
            console.log("Client disconnected", client.id)
            let status = await this.MediasoupService.leaveRoom(client.data.roomId, client.data.userId)
            if (client.data.silentDisconnect == false) {
                client.broadcast.emit("userLeft", { name: client.data.userName, id: client.data.userId })
            }
            return status
        } catch (err) {
        }
    }


    @SubscribeMessage('initialize')
    async joinRoom(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(initializeMeetingReqSchema)) payload: InitializeMeet) {

        let { userId, userName, pfpUrl } = client.data

        let meet = await this.meetService.getDetailsFromId(payload.id)
        if (meet.creator == userId) {
            this.MediasoupService.addUserToOwnerList(client, meet.id)
        } else {
            if (meet.inviteOnly == true) {
                let permission = await this.admissionService.getWaitingUserFromRedis(meet.id, userId);
                client.data.silentDisconnect = true
                if (permission?.status !== "admitted") return false
            }
        }
        client.data.roomId = payload.id
        client.data.silentDisconnect = false
        await this.MediasoupService.addNewRoom(meet.id)
        await client.join(payload.id)

        client.broadcast.to(payload.id).emit('newUserJoined', { userId: userId, name: userName, imgSrc: pfpUrl })
        await this.MediasoupService.addUserToRoom({ name: userName, id: userId }, payload.id)
        return true
    }



    @SubscribeMessage('getRTPCapabilities')
    async getRTPCapabilities(@ConnectedSocket() client: CustomSocket) {
        const capabilities = await this.MediasoupService.getRouterCapabilities(client.data.roomId);
        client.emit('RTPCapabilities', { data: capabilities });
    }


    @SubscribeMessage('createTransport')
    async createTransport(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(createTransportReqSchema)) payload: CreateTrasnsportReq) {
        const transport = await this.MediasoupService.createTransport(client.data.roomId, client.data.userId, payload.consumer);
        return transport
    }

    @SubscribeMessage('transportConnect')
    async transportConnect(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(transportConnectReqSchema)) payload: TransportConnectReq) {
        await this.MediasoupService.setDtlsParameters(payload.transportId, payload.dtlsParameters, client.data.roomId, payload.consumer);
        return true
    }

    @SubscribeMessage('transportProduce')
    async transportProduce(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(transportProduceReqSchema)) payload: TransportProduceReq) {
        let producer = await this.MediasoupService.createProducerFromTransport(payload, client.data.roomId, client.data.userId);
        client.broadcast.to(client.data.roomId).emit('newProducer', { userId: client.data.userId, producerId: producer.id, kind: producer.kind })
        return producer;
    }

    @SubscribeMessage('transportConsume')
    async transportConsume(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(transportConsumeReqSchema)) payload: TransportConsumeReq) {
        let consumerInfo = await this.MediasoupService.createConsumerFromTransport(payload, client.data.roomId, client.data.userId);
        return consumerInfo;
    }


    @SubscribeMessage('resumeConsumeTransport')
    async resumeConsumeTransport(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(resumeConsumeTransportReqSchema)) payload: ResumeConsumeTransportReq) {
        let status = await this.MediasoupService.resumeConsumerTransport(client.data.roomId, payload.consumerId);
        return status;
    }


    @SubscribeMessage('getAllUsersInRoom')
    async getAllUsersInformation(@ConnectedSocket() client: CustomSocket) {
        let users = await this.MediasoupService.getAllUserDetailsInRoom(client.data.roomId)
        return users
    }


    @SubscribeMessage('consumeNewUser')
    async consumeNewUser(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(consumeSingleUserReqSchema)) payload: ConsumeSingleUserReq) {
        let consumersInfo = await this.MediasoupService.consumeSingleUser(payload, client.data.roomId, client.data.userId);
        return consumersInfo
    }


    @SubscribeMessage('closeProducer')
    async closeProducer(
        @ConnectedSocket() client: CustomSocket,
        @MessageBody(new ZodValidationPipe(closeProducerReqSchema)) payload: CloseProducerReq) {
        let producerInfo = await this.MediasoupService.closeProducer(client.data.roomId, client.data.userId, payload.producerId);
        client.broadcast.emit('producerClosed', producerInfo)
        return producerInfo
    }

}
