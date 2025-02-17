import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { MediasoupService } from './mediasoup.service';
import type { Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { MeetService } from 'src/meet/meet.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { OnModuleInit } from '@nestjs/common';

@WebSocketGateway(7000, { cors: { origin: '*' } })
export class MediasoupGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    private subClient: Redis
    private roomOwners: Map<string, Socket> = new Map() // roomid,socket

    constructor(
        private readonly MediasoupService: MediasoupService,
        private readonly userService: UsersService,
        private readonly meetService: MeetService,
        private readonly redis: RedisService
    ) {
        this.subClient = redis.getOrThrow('subscriber')
    }


    async onModuleInit() {
        this.subClient.on("message", (ch, msg) => {
            if (ch == "user-waiting") {
                let { roomId, userId, userName, pfp }:
                    { roomId: string, userId: string, userName: string, pfp: string | null } = JSON.parse(msg)

                let owner = this.roomOwners.get(roomId)

                owner?.emit("pending-approval", {
                    roomId: roomId,
                    userId,
                    userName,
                    pfp
                })
            }
        })
        await this.subClient.subscribe("user-waiting")
    }


    handleConnection(client: Socket, ...args: any[]) {
        console.log("New conenction req", client.id)
    }


    handleDisconnect(client: Socket) {
        console.log("Client disconnected", client.id)
        client.broadcast.emit("userLeft", { name: client.data.nickname, id: client.data.userId })
        let status = this.MediasoupService.leaveRoom(client.data.roomId, client.data.userId)
        return status
    }

    @SubscribeMessage('initialize')
    async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let user = await this.userService.getUser(payload.userId);
        let meet
        try {
            let meet2 = await this.meetService.getDetailsFromId(payload.id)
            meet = meet2
            if (meet2.creator == user.id) {
                this.roomOwners.set(meet2.id, client)
            }

        } catch (e) {
            return false
        }
        if (!user) {
            client.disconnect()
            throw new Error("User not found with this id")
        }
        client.data.roomId = payload.id
        client.data.userId = payload.userId
        client.data.nickname = user.name

        await this.MediasoupService.addNewRoom(meet.id)
        await client.join(payload.id)

        client.broadcast.to(payload.id).emit('newUserJoined', { userId: payload.userId, name: user.name, imgSrc: user.pfpUrl })
        await this.MediasoupService.addUserToRoom({ name: user.name, id: user.id }, payload.id)
        return true
    }

    @SubscribeMessage('getRTPCapabilities')
    async getRTPCapabilities(@ConnectedSocket() client: Socket) {
        let roomId = client.data.roomId
        const capabilities = await this.MediasoupService.getRouterCapabilities(roomId);
        client.emit('RTPCapabilities', { data: capabilities });
    }

    @SubscribeMessage('createTransport')
    async createTransport(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        const transport = await this.MediasoupService.createTransport(client.data.roomId, client.data.userId, payload.consumer);
        return transport
    }

    @SubscribeMessage('transportConnect')
    async transportConnect(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        await this.MediasoupService.setDtlsParameters(payload.transportId, payload.dtlsParameters, client.data.roomId, payload.consumer);
        return true
    }

    @SubscribeMessage('transportProduce')
    async transportProduce(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let producer = await this.MediasoupService.createProducerFromTransport(payload, client.data.roomId, client.data.userId);
        client.broadcast.to(client.data.roomId).emit('newProducer', { userId: client.data.userId, producerId: producer.id, kind: producer.kind })
        return producer;
    }

    @SubscribeMessage('transportConsume')
    async transportConsume(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let consumerInfo = await this.MediasoupService.createConsumerFromTransport(payload, client.data.roomId, client.data.userId);
        return consumerInfo;
    }
    @SubscribeMessage('resumeConsumeTransport')
    async resumeConsumeTransport(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let status = await this.MediasoupService.resumeConsumerTransport(client.data.roomId, payload.consumerId);

        return status;
    }

    @SubscribeMessage('getAllUsersInRoom')
    async getAllUsersInformation(@ConnectedSocket() client: Socket) {
        let users = await this.MediasoupService.getAllUserDetailsInRoom(client.data.roomId)
        return users
    }

    @SubscribeMessage('consumeNewUser')
    async consumeNewUser(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let consumersInfo = await this.MediasoupService.consumeSingleUser(payload, client.data.roomId, client.data.userId, payload.producerId);
        return consumersInfo
    }


    @SubscribeMessage('closeProducer')
    async closeProducer(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let producerInfo = await this.MediasoupService.closeProducer(client.data.roomId, client.data.userId, payload.producerId);
        client.broadcast.emit('producerClosed', producerInfo)
        return producerInfo
    }

}
