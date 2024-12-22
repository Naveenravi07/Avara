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

@Injectable()
export class MediasoupService implements OnModuleInit, OnModuleDestroy {
  private worker!: Worker;
  private router!: Router;
  private transports: Map<String, Transport> = new Map();
  private producers: Map<String, Producer> = new Map();
  private consumers: Map<String, Consumer> = new Map();

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

  async addUserToRoom(roomId: string) {}

  getRouterCapabilities(): RtpCapabilities {
    return this.router?.rtpCapabilities;
  }

  async createTransport() {
    let transport = await this.router.createWebRtcTransport({
      listenIps: [{ ip: '127.0.0.1' }],
      enableTcp: true,
      enableUdp: true,
      preferUdp: true,
    });
    this.transports.set(transport.id, transport);
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async setDtlsParameters(transportId: string, dtlsParameters: DtlsParameters) {
    let item = this.transports.get(transportId);
    if (!item) {
      throw new Error('Transport with id not found');
    }
    let body = { dtlsParameters: dtlsParameters };
    await item.connect(body);
  }

  async createProducerFromTransport(data: any) {
    const {
      kind,
      rtpParameters,
      appData,
      transportId,
    }: {
      kind: MediaKind;
      rtpParameters: RtpParameters;
      appData: AppData;
      transportId: String;
    } = data;

    let transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport with id not found');
    }
    const producer = await transport.produce({
      kind: kind,
      rtpParameters: rtpParameters,
      appData: appData || {},
    });
    this.producers.set(producer.id, producer);
    return { id: producer.id };
  }

  async createConsumerFromTransport(data: any) {
    const {
      rtpCapabilities,
      producerId,
      transportId,
    }: { rtpCapabilities: RtpCapabilities; producerId: string; transportId: string } = data;
    if (!this.router.canConsume({ rtpCapabilities, producerId })) {
      throw new Error('Router cannot consume ');
    }
    const transport = this.transports.get(transportId);
    if (!transport) {
      throw new Error('Transport not found');
    }
    let consumer = await transport.consume({
      rtpCapabilities: rtpCapabilities,
      producerId: producerId,
      paused: true,
    });
    this.consumers.set(consumer.id, consumer);
    return consumer.id;
  }

  onModuleDestroy() {
    this.worker.close();
  }
}
