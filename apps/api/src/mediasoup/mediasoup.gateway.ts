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

@WebSocketGateway(7000, { cors: { origin: '*' } })
export class MediasoupGateway implements OnGatewayConnection,OnGatewayDisconnect {
    constructor(
        private readonly MediasoupService: MediasoupService,
        private readonly userService: UsersService
    ) { }

    handleConnection(client: Socket, ...args: any[]) {
        console.log("New conenction req",client.id)
    }
    handleDisconnect(client: Socket) {
        console.log("Client disconnected",client.id)
    }
    
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
        await client.join(payload.id)
        await this.MediasoupService.addUserToRoom({name:user.name,id:user.id},payload.id)
    }

    @SubscribeMessage('getRTPCapabilities')
    async getRTPCapabilities(@ConnectedSocket() client: Socket) {
        let roomId = client.data.roomId
        const capabilities = await this.MediasoupService.getRouterCapabilities(roomId);
        client.emit('RTPCapabilities', { data: capabilities });
    }

    @SubscribeMessage('createTransport')
    async createTransport(@ConnectedSocket() client: Socket,@MessageBody() payload: any) {
        const transport = await this.MediasoupService.createTransport(client.data.roomId,client.data.userId,payload.consumer);
        return transport
    }

    @SubscribeMessage('transportConnect')
    async transportConnect(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        await this.MediasoupService.setDtlsParameters(payload.transportId, payload.dtlsParameters,client.data.roomId,payload.consumer);
    }

    @SubscribeMessage('transportProduce')
    async transportProduce(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let producer = await this.MediasoupService.createProducerFromTransport(payload,client.data.roomId,client.data.userId);
        return producer;
    }

    @SubscribeMessage('transportConsume')
    async transportConsume(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let consumerInfo = await this.MediasoupService.createConsumerFromTransport(payload,client.data.roomId,client.data.userId);
        return consumerInfo;
    }
    @SubscribeMessage('resumeConsumeTransport')
    async resumeConsumeTransport(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
        let status = await this.MediasoupService.resumeConsumerTransport(client.data.roomId,payload.consumerId);
        return status;
    }

    @SubscribeMessage('getAllUsersInRoom')
    async getAllUsersInformation(@ConnectedSocket() client:Socket){
        let users = await this.MediasoupService.getAllUserDetailsInRoom(client.data.roomId)
        return users
    }
}
