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
    private worker: Worker | undefined
    private rooms: Map<string, Room> = new Map()

    async onModuleInit() {
        if (this.worker) return
        this.worker = await mediasoup.createWorker({
            logLevel: "warn",
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
        if (!this.worker) {
            throw new Error("Worker not found exiting..")
        }
        if (!room) {
            throw new Error("Room not found exiting..")
        }
        if (!room.router) {
            room.router = await this.worker?.createRouter({
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
                    protocol: 'udp',
                    ip: '0.0.0.0',
                    announcedAddress: '192.168.0.110',
                    portRange: { min: 40000, max: 40100 }
                },
                {
                    protocol: 'tcp',
                    ip: '0.0.0.0',
                    announcedAddress: '192.168.0.110',
                    portRange: { min: 40000, max: 40100 }
                }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            iceConsentTimeout: 20,
            initialAvailableOutgoingBitrate: 1000000
        });

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
        return true
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
        return { id: producer.id, userId: userId,kind:kind };
    }




    async createConsumerFromTransport(data: any, roomId: string, userId: string) {
        const { rtpCapabilities }: { rtpCapabilities: RtpCapabilities } = data;

        const room = this.rooms.get(roomId);
        if (!room || !room.router) {
            throw new Error("Room or router not found");
        }

        let myData = room.users.get(userId);
        if (!myData) {
            throw new Error("Failed to get transport data");
        }

        let myTransport = myData.transportIds.map((tid) => room.transports.get(tid))
        let myConsumeTransport = myTransport?.filter((obj) => obj?.consumer == true);
        let myConsumeRecvTrans = myConsumeTransport[0]?.transport.id

        let consumersInfo: any[] = []

        for (const user of room.users.values()) { // Map through each of users in room
            if (user.id === userId) continue; // Skip consuming my own producers
            for (const producerId of user.producersIds) {  // Going through each producers of users in room
                const producer = room.producers.get(producerId);
                if (!producer) continue;

                if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                    continue;
                }

                if (!myConsumeRecvTrans) {
                    throw new Error("Failed to get the transport id ")
                }
                const transport = room.transports.get(myConsumeRecvTrans);
                if (!transport) {
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
                }
            }
        }
        return consumersInfo
    }





    async consumeSingleUser(data: any, roomId: string, my_uid: string, producerId: string) {
        const { rtpCapabilities }: { rtpCapabilities: RtpCapabilities } = data;
        const room = this.rooms.get(roomId);

        if (!room || !room.router) {
            throw new Error("Room or router not found");
        }

        let myData = room.users.get(my_uid);
        if (!myData) {
            throw new Error("Failed to get transport data");
        }

        let myTransport = myData.transportIds.map((tid) => room.transports.get(tid))
        let myConsumeTransport = myTransport?.filter((obj) => obj?.consumer == true);
        let myConsumeRecvTrans = myConsumeTransport[0]?.transport

        if (!myConsumeRecvTrans) {
            throw new Error("Failed to get your transport data")
        }

        let producer = room.producers.get(producerId)
        if (!producer) {
            throw new Error("Failed to get producer information")
        }

        let consumer = await myConsumeRecvTrans.consume({
            producerId: producer.producer.id,
            paused: true,
            rtpCapabilities: rtpCapabilities
        })
        let resp = {
            producerId: producer.producer.id,
            id: consumer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters
        }

        myData.consumersIds.push(consumer.id)
        room.consumers.set(consumer.id, {
            consumer,
            producerId: producer.producer.id,
            transportId: myConsumeRecvTrans.id,
            userId: my_uid,
        });

        return resp
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

    async closeProducer(roomId:string,userId:string,producerId:string){
        const room = this.rooms.get(roomId);

        if (!room || !room.router) {
            throw new Error("Room or router not found");
        }

        let myData = room.users.get(userId);
        if (!myData) {
            throw new Error("Failed to get user data");
        }
        let producer = room.producers.get(producerId)
        if(!producer){
            throw new Error("Error getting producer data")
        }

        producer.producer.close()
        myData.producersIds = myData.producersIds.filter((id)=>id != producer.producer.id)
        room.producers.delete(producerId)
        return{
            producerId: producer.producer.id,
            kind:producer.kind,
            userId:userId
        }
    }

    onModuleDestroy() {
        this.worker?.close();
    }
}
