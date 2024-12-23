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

type User = {
    id: string,
    name: string,
}

type Room = {
    router: Router | null
    users: User[],
    transports: Transport[],
    producers: Producer[],
    consumers: Consumer[],
}

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
    private worker!: Worker;
    private rooms: Map<String, Room> = new Map()

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

    async addNewRoom(roomId: string, user: User) {
        if (this.rooms.has(roomId)) {
            throw new Error("Room already exists")
        }
        this.rooms.set(roomId, {
            users: [{ name: user.name, id: user.id }],
            router: null,
            transports: [],
            consumers: [],
            producers: []
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

    async createTransport(roomId: string) {
        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found for creating transport")
        }
        if (!room.router) {
            throw new Error("Router not found inside room")
        }
        let transport = await room.router.createWebRtcTransport({
            listenIps: [{ ip: '127.0.0.1' }],
            enableTcp: true,
            enableUdp: true,
            preferUdp: true,
        })
        room.transports.push(transport)
        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };
    }

    async setDtlsParameters(transportId: string, dtlsParameters: DtlsParameters, roomId: string) {
        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found ")
        }
        let item = room.transports.find((obj) => obj.id == transportId);
        if (!item) {
            throw new Error('Transport with id not found');
        }
        await item.connect({
            dtlsParameters: dtlsParameters
        });
    }

    async createProducerFromTransport(data: any, roomId: string) {
        const { kind, rtpParameters, appData, transportId, }: {
            kind: MediaKind;
            rtpParameters: RtpParameters;
            appData: AppData;
            transportId: String;
        } = data;

        let room = this.rooms.get(roomId)
        if (!room) {
            throw new Error("Room not found ")
        }

        let transport = room.transports.find((obj) => obj.id == transportId);
        if (!transport) {
            throw new Error('Transport not found');
        }
        const producer = await transport.produce({
            kind: kind,
            rtpParameters: rtpParameters,
            appData: appData || {},
        });
        room.producers.push(producer)
        return { id: producer.id };
    }

    async createConsumerFromTransport(data: any, roomId: string) {
        const {
            rtpCapabilities,
            producerId,
        }: { rtpCapabilities: RtpCapabilities; producerId: string; } = data;

        let room = this.rooms.get(roomId)
        console.log("Inside consumer create")

        if (!room) {
            throw new Error("Room not found ")
        }
        if (!room.router) {
            throw new Error("Router not found")
        }

        if (!room.router.canConsume({ rtpCapabilities, producerId })) {
            throw new Error('Router cannot consume ');
        }

    }

    onModuleDestroy() {
        this.worker.close();
    }
}
