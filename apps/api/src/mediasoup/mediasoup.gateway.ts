import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { MediasoupService } from './mediasoup.service';
import type { Socket } from 'socket.io';

@WebSocketGateway(7000, { cors: { origin: '*', methods: ['GET', 'POST'] } })
export class MediasoupGateway {
    constructor(private readonly MediasoupService: MediasoupService) { }

    @SubscribeMessage('joinRoom')
    async joinRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: any,
    ) {
        let resp = this.MediasoupService.addUserToRoom(payload.id);
    }

    @SubscribeMessage('getRTPCapabilities')
    async getRTPCapabilities(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        const capabilities = this.MediasoupService.getRouterCapabilities();
        client.emit('RTPCapabilities', { data: capabilities });
    }

    @SubscribeMessage('createTransport')
    async createTransport(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        const transport = await this.MediasoupService.createTransport();
        client.emit('TransportData', transport);
    }

    @SubscribeMessage('transportConnect')
    async transportConnect(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        await this.MediasoupService.setDtlsParameters(payload.transportId, payload.dtlsParameters);
    }

    @SubscribeMessage('transportProduce')
    async transportProduce(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let producer = await this.MediasoupService.createProducerFromTransport(payload);
        return producer;
    }

    @SubscribeMessage('startConsume')
    async consumeHandler(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        console.log('Server starting to consume');
        console.log(payload);
    }

    @SubscribeMessage('transportConsume')
    async transportConsume(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let consumerId = await this.MediasoupService.createConsumerFromTransport(payload);
        return consumerId;
    }
}
