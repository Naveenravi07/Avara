import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { MediasoupService } from './mediasoup.service';
import type { Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';

@WebSocketGateway(7000, { cors: { origin: '*', methods: ['GET', 'POST'] } })
export class MediasoupGateway {
    constructor(
        private readonly MediasoupService: MediasoupService,
        private readonly userService: UsersService
    ) { }

    @SubscribeMessage('initialize')
    async joinRoom(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let user = await this.userService.getUser(payload.userId);
        if (!user) {
            client.disconnect()
            throw new Error("User not found with this id")
        }
        client.data.roomId = payload.id
        client.data.userId = payload.userId
        client.data.nickname = user.name
    }

    @SubscribeMessage('getRTPCapabilities')
    async getRTPCapabilities(@ConnectedSocket() client: Socket) {
        let roomId = client.data.roomId
        const capabilities = await this.MediasoupService.getRouterCapabilities(roomId);
        client.emit('RTPCapabilities', { data: capabilities });
    }

    @SubscribeMessage('createTransport')
    async createTransport(@ConnectedSocket() client: Socket) {
        const transport = await this.MediasoupService.createTransport(client.data.roomId);
        client.emit('TransportData', transport);
    }

    @SubscribeMessage('transportConnect')
    async transportConnect(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        await this.MediasoupService.setDtlsParameters(payload.transportId, payload.dtlsParameters,client.data.roomId);
    }

    @SubscribeMessage('transportProduce')
    async transportProduce(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let producer = await this.MediasoupService.createProducerFromTransport(payload,client.data.roomId);
        return producer;
    }

    @SubscribeMessage('transportConsume')
    async transportConsume(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let consumerId = await this.MediasoupService.createConsumerFromTransport(payload,client.data.roomId);
        return consumerId;
    }
}
