import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Router, RtpCapabilities, Transport, DtlsParameters, WebRtcTransport } from 'mediasoup/node/lib/types';
import * as mediasoup from 'mediasoup';


@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
    private worker!: Worker;
    private router!: Router;
    private transports: Map<String, Transport> = new Map()

    async onModuleInit() {
        this.worker = await mediasoup.createWorker({
            logLevel: 'warn',
            appData: { foo: 123 },
        });
        this.worker.on('died', () => {
            console.log('Meidasoup worker died');
            process.exit(1);
        });
        this.router = await this.worker.createRouter({
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

    getRouterCapabilities(): RtpCapabilities {
        return this.router?.rtpCapabilities;
    }

    async createTransport() {
        let transport = await this.router.createWebRtcTransport({
            listenIps: [{ ip: "127.0.0.1" }],
            enableTcp: true,
            enableUdp: true,
            preferUdp: true
        })
        this.transports[transport.id] = transport
        return {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        }
    }

    async setDtlsParameters(transportId: string, dtlsParameters: DtlsParameters) {
        let item = this.transports.get(transportId)
        item?.connect(dtlsParameters)
    }

    async createProducerFromTransport(data: any) {
        // console.log("Printing all transports    ")
        // console.log(this.transports)

        let transport = this.transports.get(data.transportId)
        // console.log("Found transport with id =" + data.transportId + "   " +transport)

        let producer = transport?.produce(data.appData)
        return producer
    }

    onModuleDestroy() {
        this.worker.close();
    }
}
