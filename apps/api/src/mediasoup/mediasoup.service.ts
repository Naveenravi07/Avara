import { Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
    Worker,
    Router,
    RtpCapabilities,
    Transport,
    DtlsParameters,
    MediaKind,
    Producer,
    Consumer,
} from 'mediasoup/node/lib/types';
import * as mediasoup from 'mediasoup';
import { UsersService } from 'src/users/users.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { CustomSocket } from 'src/admission/dto/admission-socket';
import { TransportProduceReq } from './dto/transport-produce-req';
import { ConsumeSingleUserReq } from './dto/consume-single-user-req';
import { type TransportConsumeReq } from './dto/transport-cnsume-req';


type UserData = {
    id: string;
    name: string;
    imgSrc: string;
    transportIds: string[];
    producersIds: string[];
    consumersIds: string[];
};

type TransportData = {
    userId: string;
    transport: Transport;
    consumer: boolean;
};

type ProducerData = {
    userId: string;
    transportId: string;
    producer: Producer;
    kind: MediaKind;
};

type ConsumerData = {
    userId: string;
    transportId: string;
    producerId: string;
    consumer: Consumer;
};

type Room = {
    router: Router | null;
    users: Map<string, UserData>;
    transports: Map<string, TransportData>;
    producers: Map<string, ProducerData>;
    consumers: Map<string, ConsumerData>;
};

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
    private subClient: Redis;
    private roomOwners: Map<string, CustomSocket> = new Map(); // roomId -> socket
    private worker: Worker | undefined;
    private rooms: Map<string, Room> = new Map();

    constructor(
        private readonly userService: UsersService,
        private readonly redis: RedisService,
    ) {
        this.subClient = redis.getOrThrow('subscriber');
    }

    async onModuleInit() {
        if (this.worker) return;

        this.worker = await mediasoup.createWorker({
            logLevel: 'warn',
            appData: { foo: 123 },
        });

        this.worker.on('died', () => {
            console.error('Mediasoup worker died');
            process.exit(1);
        });
    }

    async subscribeToMessages() {
        this.subClient.on('message', (channel, message) => {
            if (channel === 'user-waiting') {
                const { roomId, userId, userName, pfp } = JSON.parse(message);
                const owner = this.roomOwners.get(roomId);

                owner?.emit('pending-approval', {
                    roomId,
                    userId,
                    userName,
                    pfp,
                });
            }
        });

        await this.subClient.subscribe('user-waiting');
    }

    async addNewRoom(roomId: string) {
        if (this.rooms.has(roomId)) return;

        this.rooms.set(roomId, {
            router: null,
            users: new Map(),
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
        });
    }

    async addUserToOwnerList(socket: CustomSocket, roomId: string) {
        this.roomOwners.set(roomId, socket);
    }

    async addUserToRoom(user: { name: string; id: string }, roomId: string) {
        const room = this.getRoomOrThrow(roomId);
        const userData = await this.userService.getUser(user.id);

        room.users.set(user.id, {
            id: user.id,
            name: user.name,
            imgSrc: userData.pfpUrl || 'https://i.scdn.co/image/ab67616100005174305839f7ed0cdbc450e4ec97',
            transportIds: [],
            producersIds: [],
            consumersIds: [],
        });
    }

    async getRouterCapabilities(roomId: string): Promise<RtpCapabilities> {
        const room = this.getRoomOrThrow(roomId);
        if (!this.worker) throw new Error('Worker not found');

        if (!room.router) {
            room.router = await this.worker.createRouter({
                mediaCodecs: [
                    {
                        kind: 'audio',
                        mimeType: 'audio/opus',
                        clockRate: 48000,
                        channels: 2,
                    },
                    {
                        kind: 'video',
                        mimeType: 'video/VP8',
                        clockRate: 90000,
                        parameters: {
                            'x-google-start-bitrate': 8000,
                        },
                    },
                ],
            });
        }

        return room.router.rtpCapabilities;
    }

    async createTransport(roomId: string, userId: string, isConsumer: boolean) {
        const room = this.getRoomOrThrow(roomId);
        if (!room.router) throw new Error('Router not found');

        const transport = await room.router.createWebRtcTransport({
            listenInfos: [
                {
                    protocol: 'udp',
                    ip: '0.0.0.0',
                    announcedAddress: '192.168.0.110',
                    portRange: { min: 40000, max: 40100 },
                },
                {
                    protocol: 'tcp',
                    ip: '0.0.0.0',
                    announcedAddress: '192.168.0.110',
                    portRange: { min: 40000, max: 40100 },
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            iceConsentTimeout: 20,
            initialAvailableOutgoingBitrate: 1000000,
        });

        room.transports.set(transport.id, {
            userId,
            transport,
            consumer: isConsumer,
        });

        room.users.get(userId)?.transportIds.push(transport.id);

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async setDtlsParameters(transportId: string, dtlsParameters: DtlsParameters, roomId: string, consumer: boolean) {
        const room = this.getRoomOrThrow(roomId);
        const transportData = this.getTransportOrThrow(room, transportId);

        if (transportData.consumer !== consumer) {
            throw new Error('Invalid transport type');
        }

        await transportData.transport.connect({ dtlsParameters });
        return true;
    }

    async createProducerFromTransport(data: TransportProduceReq, roomId: string, userId: string) {
        const { kind, rtpParameters, appData, transportId } = data;
        const room = this.getRoomOrThrow(roomId);
        const transportData = this.getTransportOrThrow(room, transportId);

        const producer = await transportData.transport.produce({
            kind,
            rtpParameters,
            appData: appData || {},
        });

        room.producers.set(producer.id, {
            userId,
            transportId: transportData.transport.id,
            producer,
            kind,
        });

        room.users.get(userId)?.producersIds.push(producer.id);

        return { id: producer.id, userId, kind };
    }

    async createConsumerFromTransport(data: TransportConsumeReq, roomId: string, userId: string) {
        const { rtpCapabilities } = data;
        const room = this.getRoomOrThrow(roomId);
        const userData = this.getUserOrThrow(room, userId);

        const consumerTransport = this.getConsumerTransport(room, userData);
        if (!consumerTransport) throw new Error('Failed to get consumer transport');

        const consumersInfo: any[] = [];

        for (const user of room.users.values()) {
            if (user.id === userId) continue; // Skip self

            for (const producerId of user.producersIds) {
                const producer = room.producers.get(producerId);
                if (!producer || !room.router?.canConsume({ producerId, rtpCapabilities })) continue;

                try {
                    const consumer = await consumerTransport.transport.consume({
                        producerId,
                        rtpCapabilities,
                        paused: true,
                    });

                    user.consumersIds.push(consumer.id);
                    room.consumers.set(consumer.id, {
                        userId,
                        transportId: consumerTransport.transport.id,
                        producerId,
                        consumer,
                    });

                    consumersInfo.push({
                        id: consumer.id,
                        producerId,
                        kind: producer.kind,
                        rtpParameters: consumer.rtpParameters,
                        userId: producer.userId,
                    });

                } catch (err) {
                    console.error('Failed to create consumer:', err);
                }
            }
        }

        return consumersInfo;
    }

    async consumeSingleUser(data: ConsumeSingleUserReq, roomId: string, userId: string) {
        const { rtpCapabilities, producerId } = data;
        const room = this.getRoomOrThrow(roomId);
        const userData = this.getUserOrThrow(room, userId);

        const consumerTransport = this.getConsumerTransport(room, userData);
        if (!consumerTransport) throw new Error('Failed to get consumer transport');

        const producer = room.producers.get(producerId);
        if (!producer) throw new Error('Failed to get producer');

        const consumer = await consumerTransport.transport.consume({
            producerId: producer.producer.id,
            rtpCapabilities,
            paused: true,
        });

        userData.consumersIds.push(consumer.id);
        room.consumers.set(consumer.id, {
            userId,
            transportId: consumerTransport.transport.id,
            producerId: producer.producer.id,
            consumer,
        });

        return {
            producerId: producer.producer.id,
            id: consumer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        };
    }

    async resumeConsumerTransport(roomId: string, consumerId: string) {
        const room = this.getRoomOrThrow(roomId);
        const consumer = room.consumers.get(consumerId);

        if (!consumer) throw new Error('Consumer not found');
        await consumer.consumer.resume();

        return true;
    }

    async getAllUserDetailsInRoom(roomId: string) {
        const room = this.getRoomOrThrow(roomId);
        return Array.from(room.users.values()).map((user) => ({
            id: user.id,
            name: user.name,
            imgSrc: user.imgSrc,
        }));
    }

    async closeProducer(roomId: string, userId: string, producerId: string) {
        const room = this.getRoomOrThrow(roomId);
        const userData = this.getUserOrThrow(room, userId);
        const producer = room.producers.get(producerId);

        if (!producer) throw new Error('Producer not found');

        producer.producer.close();
        userData.producersIds = userData.producersIds.filter((id) => id !== producerId);
        room.producers.delete(producerId);

        return {
            producerId: producer.producer.id,
            kind: producer.kind,
            userId,
        };
    }

    async leaveRoom(roomId: string, userId: string) {
        const room = this.getRoomOrThrow(roomId);
        const userData = this.getUserOrThrow(room, userId);

        userData.consumersIds.forEach((id) => room.consumers.delete(id));
        userData.producersIds.forEach((id) => room.producers.delete(id));
        userData.transportIds.forEach((id) => room.transports.delete(id));
        room.users.delete(userId);

        return true;
    }

    onModuleDestroy() {
        this.worker?.close();
    }





    // Helper methods
    private getRoomOrThrow(roomId: string): Room {
        const room = this.rooms.get(roomId);
        if (!room) throw new Error('Room not found');
        return room;
    }

    private getTransportOrThrow(room: Room, transportId: string): TransportData {
        const transport = room.transports.get(transportId);
        if (!transport) throw new Error('Transport not found');
        return transport;
    }

    private getUserOrThrow(room: Room, userId: string): UserData {
        const user = room.users.get(userId);
        if (!user) throw new Error('User not found');
        return user;
    }

    private getConsumerTransport(room: Room, userData: UserData): TransportData | undefined {
        const transports = userData.transportIds
            .map((id) => room.transports.get(id))
            .filter((t) => t?.consumer);

        return transports[0];
    }
}
