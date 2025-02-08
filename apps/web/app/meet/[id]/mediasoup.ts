import * as mediasoupClient from 'mediasoup-client';
import { Transport } from 'mediasoup-client/lib/types';
import socket from '@/lib/socket';

export class MediasoupHandler {
    private device: mediasoupClient.Device | null = null;
    private recvTransport: Transport | null = null;
    private sendTransport: Transport | null = null;

    constructor() {
        this.device = new mediasoupClient.Device();
    }

    public async initializeDevice(rtpCapabilities: any): Promise<void> {
        if (!this.device) return;
        if (!this.device.loaded) {
            var cap = { routerRtpCapabilities: rtpCapabilities };
            await this.device.load(cap)
                .then((stat) => console.log("Device loaded successfully", stat))
                .catch((stat) => console.log("Device loaded failed", stat))
        }
    }

    public isDeviceLoaded(): boolean {
        return this.device?.loaded || false
    }

    public async getDeviceRTPCapabilities() {
        return this.device?.rtpCapabilities
    }

    public async createSendTransport(videoTrack: MediaStreamTrack): Promise<void> {
        if (!this.device) return;

        return new Promise(async (resolve, reject) => {
            socket.emit('createTransport', { consumer: false }, async (transportData: any) => {
                this.sendTransport = this.device!.createSendTransport(transportData);

                this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errorback) => {
                    try {
                        socket.emit('transportConnect', {
                            transportId: this.sendTransport!.id,
                            dtlsParameters: dtlsParameters,
                            consumer: false,
                        }, () => {
                            callback();
                        });
                    } catch (error) {
                        errorback(error as Error);
                    }
                });

                this.sendTransport.on('produce', async (parameters, callback, errback) => {
                    try {
                        socket.emit('transportProduce', {
                            transportId: this.sendTransport!.id,
                            kind: parameters.kind,
                            rtpParameters: parameters.rtpParameters,
                            appData: parameters.appData,
                        }, (data: any) => {
                            callback({ id: data.id });
                        });
                    } catch (err) {
                        errback(err as Error);
                    }
                });

                await this.produceVideo(this.sendTransport, videoTrack).then(resolve).catch(reject);
            });
        });
    }



    private async produceVideo(sendTransport: Transport, videoTrack: MediaStreamTrack): Promise<void> {
        try {
            const producer = await sendTransport.produce({
                track: videoTrack,
                encodings: [
                    { maxBitrate: 100000 },
                    { maxBitrate: 300000 },
                    { maxBitrate: 900000 },
                ],
                codecOptions: {
                    videoGoogleStartBitrate: 1000,
                },
            });
            console.log('Producer created successfully:', producer);
        } catch (err) {
            console.error('Error producing video:', err);
            console.log(err)
        }
    }



    public async createRecvTransport(): Promise<void> {
        if (!this.device) return;

        return new Promise((resolve, reject) => {
            socket.emit('createTransport', { consumer: true }, (transportData: any) => {
                this.recvTransport = this.device!.createRecvTransport(transportData);

                this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                    try {
                        socket.emit('transportConnect', {
                            transportId: this.recvTransport!.id,
                            dtlsParameters: dtlsParameters,
                            consumer: true,
                        }, () => {
                            callback();
                        });
                    } catch (err) {
                        errback(err as Error);
                    }
                });

                resolve();
            });
        });
    }

    public async consumeAllVideoStreams(): Promise<Map<string, MediaStreamTrack>> {
        if (!this.device || !this.recvTransport) return new Map();

        return new Promise((resolve, reject) => {
            socket.emit('transportConsume', {
                rtpCapabilities: this.device!.rtpCapabilities,
            }, async (consumeData: any) => {
                const trackMap = new Map<string, MediaStreamTrack>();

                for (const data of consumeData) {
                    try {
                        const consumer = await this.recvTransport!.consume({
                            id: data.id,
                            producerId: data.producerId,
                            kind: data.kind,
                            rtpParameters: data.rtpParameters,
                        });

                        trackMap.set(data.userId, consumer.track);

                        socket.emit('resumeConsumeTransport', {
                            consumerId: consumer.id,
                        }, () => {
                            console.log('Consumer resumed successfully:', consumer.id);
                        });
                    } catch (error) {
                        console.error('Error consuming track:', error);
                    }
                }
                resolve(trackMap);
            });
        });
    }

    public async consumeNewProducer(producerId: string, userId: string): Promise<MediaStreamTrack | null> {
        if (!this.device || !this.recvTransport) return null;

        return new Promise((resolve, reject) => {
            socket.emit('consumeNewUser', {
                rtpCapabilities: this.device!.rtpCapabilities,
                newUserId: userId,
                producerId: producerId,
            }, async (consumerData: any) => {
                try {
                    const consumer = await this.recvTransport!.consume({
                        id: consumerData.id,
                        producerId: consumerData.producerId,
                        kind: consumerData.kind,
                        rtpParameters: consumerData.rtpParameters,
                    })
                    socket.emit('resumeConsumeTransport', {
                        consumerId: consumer.id,
                    }, () => {
                        console.log('New consumer resumed successfully:', consumer.id);
                    });

                    resolve(consumer.track);
                } catch (error) {
                    console.error('Error consuming new producer:', error);
                    reject(error);
                }
            });
        });
    }

    public cleanup(): void {
        if (this.sendTransport) {
            this.sendTransport.close();
            this.sendTransport = null;
        }
        if (this.recvTransport) {
            this.recvTransport.close();
            this.recvTransport = null;
        }
        this.device = null;
    }
}
