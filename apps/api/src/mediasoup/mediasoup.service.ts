import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
    Worker,
    Router,
    RtpCapabilities,
    Transport,
    DtlsParameters,
    MediaKind,
    RtpParameters,
    AppData,
    Producer,
    Consumer,
} from 'mediasoup/node/lib/types';
import * as mediasoup from 'mediasoup';

type UserData = {
    id: string,
    name: string,
    transportIds: string[],
    producersIds: string[]
    consumersIds: string[]
}
type TransportData = {
    userId: string,
    transport: Transport,
    consumer: boolean
}

type ProducerData = {
    userId: string,
    transportId: string,
    producer: Producer,
    kind: "video" | "audio"
}

type ConsumerData = {
    userId: string,
    transportId: string,
    producerId: string,
    consumer: Consumer,
}


type Room = {
    router: Router | null
    users: Map<string, UserData>,
    transports: Map<string, TransportData>,
    producers: Map<string, ProducerData>,
    consumers: Map<string, ConsumerData>
}

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
    private worker!: Worker;
    private rooms: Map<string, Room> = new Map()

    async onModuleInit() {
        this.worker = await mediasoup.createWorker({
            logLevel: 'warn',
            appData: { foo: 123 },
        });
        this.worker.on('died', () => {
            console.log('Meidasoup worker died');
            process.exit(1);
        });
    }

    async addNewRoom(roomId: string) {
        if (this.rooms.has(roomId)) {
            throw new Error("Room already exists")
        }
        this.rooms.set(roomId, {
            router: null,
            users: new Map(),
            transports: new Map(),
            consumers: new Map(),
            producers: new Map()
        })

    }

    async addUserToRoom({ name, id }: { name: string; id: string; }, roomId: string) {
        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room Does not exists")
        }
        room.users.set(id, {
            transportIds: [],
            producersIds: [],
            consumersIds: [],
            name: name,
            id: id
        })
    }

    async getRouterCapabilities(roomId: string): Promise<RtpCapabilities> {
        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found exiting..")
        }
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
                            'x-google-start-bitrate': 1000,
                        },
                    },
                ],
            });
        }
        return room.router.rtpCapabilities
    }

    async createTransport(roomId: string, userId: string, isConsumer: boolean) {
        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found for creating transport")
        }
        if (!room.router) {
            throw new Error("Router not found inside room")
        }
        let transport = await room.router.createWebRtcTransport({
            listenInfos: [
                {
                    ip: "0.0.0.0",
                    announcedIp: "192.168.0.111",
                    protocol: "udp"
                }
            ],
            enableTcp: true,
            enableUdp: true,
            preferUdp: true,
        })

        room.transports.set(transport.id, {
            userId: userId,
            transport: transport,
            consumer: isConsumer
        })
        room.users.get(userId)?.transportIds.push(transport.id)

        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async setDtlsParameters(transportId: string, dtlsParameters: DtlsParameters, roomId: string, consumer: boolean) {

        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found ")
        }
        let item = room.transports.get(transportId)
        if (!item) {
            throw new Error('Transport with id not found');
        }
        if (item.consumer !== consumer) {
            throw new Error("Invalid transport found")
        }
        await item.transport.connect({
            dtlsParameters: dtlsParameters
        });
    }

    async createProducerFromTransport(data: any, roomId: string, userId: string) {
        const { kind, rtpParameters, appData, transportId, }: {
            kind: MediaKind;
            rtpParameters: RtpParameters;
            appData: AppData;
            transportId: string;
        } = data;

        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found ")
        }

        let transport = room.transports.get(transportId)
        if (!transport) {
            throw new Error('Transport not found');
        }
        const producer = await transport.transport.produce({
            kind: kind,
            rtpParameters: rtpParameters,
            appData: appData || {},
        });

        room.producers.set(producer.id, {
            producer: producer,
            transportId: transport.transport.id,
            kind: kind,
            userId: userId
        })

        room.users.get(userId)?.producersIds.push(producer.id)
        return { id: producer.id };
    }

    async createConsumerFromTransport(data: any, roomId: string, userId: string) {
        const { rtpCapabilities }: { rtpCapabilities: RtpCapabilities } = data;

        const room = this.rooms.get(roomId);
        if (!room || !room.router) {
            throw new Error("Room or router not found");
        }

        let consumersInfo: any[] = []
        for (const user of room.users.values()) {
            if (user.id === userId) continue;

            for (const producerId of user.producersIds) {
                const producer = room.producers.get(producerId);
                if (!producer) continue;

                if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                    console.error(`Router cannot consume for producer ${producerId}`);
                    continue;
                }

                const transport = room.transports.get(producer.transportId);
                if (!transport) {
                    console.error(`Transport not found for producer ${producerId}`);
                    continue;
                }
                try {
                    const consumer = await transport.transport.consume({
                        producerId,
                        rtpCapabilities,
                        paused: true,
                    });

                    user.consumersIds.push(consumer.id);
                    room.consumers.set(consumer.id, {
                        consumer,
                        producerId,
                        transportId: transport.transport.id,
                        userId,
                    });
                    consumersInfo.push({
                        id: consumer.id,
                        producerId: producerId,
                        kind: producer.kind,
                        rtpParameters: consumer.rtpParameters,
                        userId: producer.userId
                    })
                } catch (err) {
                    console.error(`Failed to create consumer for producer ${producerId}:`, err);
                }
            }
        }
        return consumersInfo
    }

    async resumeConsumerTransport(roomId: string, consumerId: string) {
        const room = this.rooms.get(roomId);
        if (!room || !room.router) {
            throw new Error("Room or router not found");
        }
        let consumer = room.consumers.get(consumerId)
        await consumer?.consumer.resume()
        return true
    }

    async getAllUserDetailsInRoom(roomId: string) {
        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found")
        }
        let users = Array.from(room.users.values()).map((obj) => {
            return {
                id: obj.id,
                name: obj.name
            }
        })
        return users
    }

    onModuleDestroy() {
        this.worker.close();
    }
}
