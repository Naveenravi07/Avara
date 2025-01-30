'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { Transport } from 'mediasoup-client/lib/types';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import socket from '@/lib/socket';
import { Participant } from "../types"
import { ViewParticipants } from './participants';
import { VideoControls } from './controls';


export default function Component() {
    const { user } = useAuth()
    const { id } = useParams();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const device = useRef<mediasoupClient.Device | null>(null);

    // Storing recvTransportRef seperate since creating a recv transport is only a one step 
    // process but we need it each time when consuming a transport or video
    const recvTransportRef = useRef<Transport | null>(null);


    const getAllConnectedUserInformation = async () => {
        socket.emit('getAllUsersInRoom', null, (response: any) => {
            console.log("Users information fetched successfully", response)
            //
            // The current user is already added to participant list inside useEffect
            // so Here we are adding only the other participants.
            //
            const partis: Participant[] = response
                .filter((obj: any) => obj.id !== user?.id)
                .map((obj: any) => ({
                    id: obj.id,
                    name: obj.name,
                    videoOn: false,
                    audioOn: false,
                    track: undefined,
                    ref: React.createRef<HTMLVideoElement>(),
                }));

            console.log('Printing participants', partis);
            setParticipants((prevParticipants) => [...prevParticipants, ...partis]);
        })
    }


    const handleRTPCapabilities = async (data: any) => {
        if (!device.current) return
        if (!device.current.loaded) {
            console.log('Received RTP Capabilities:', data.data);
            var cap = { routerRtpCapabilities: data.data };
            await device.current.load(cap);
        }
        await getAllConnectedUserInformation()
        await receiveAllVideoFromServer()
    };


    const getUserMediaAndSend = async (sendTransport: Transport, videoTrack: MediaStreamTrack) => {
        try {
            const producer = await sendTransport.produce({
                track: videoTrack,
                encodings: [{ maxBitrate: 100000 }, { maxBitrate: 300000 }, { maxBitrate: 900000 }],
                codecOptions: {
                    videoGoogleStartBitrate: 1000,
                },
            });

            console.log('Producer instaniated successfully', producer);
            console.log('Producer instaniated successfully', await producer.getStats());
        } catch (err) {
            console.log(err);
        }
    };


    const sendvideoToServer = async (videoTrack: MediaStreamTrack) => {
        console.log("Emitting createTransport for producing ")
        socket.emit('createTransport', { consumer: false }, (transportData: any) => {

            if (!device.current) return
            const sendTransport = device.current.createSendTransport(transportData);
            sendTransport.on('connect', async ({ dtlsParameters }, callback, errorback) => {
                try {
                    console.log('inside Send transport connect event ');
                    console.log('emitting transportConnect with dtlsParameters and transportId');
                    console.log(`transportId = ${sendTransport.id}`);

                    socket.emit('transportConnect', {
                        transportId: sendTransport.id,
                        dtlsParameters: dtlsParameters,
                        consumer: false
                    }, (data: any) => {
                        console.log("Server acknowledged transportConnect ")
                        callback();
                    });
                } catch (error) {
                    errorback(error as Error);
                }
            });
            sendTransport.on('produce', async (parameters, callback, errback) => {
                try {
                    socket.emit(
                        'transportProduce',
                        {
                            transportId: sendTransport.id,
                            kind: parameters.kind,
                            rtpParameters: parameters.rtpParameters,
                            appData: parameters.appData,
                        },
                        (data: any) => {
                            console.log('Send transport produce event fired internally with data ', data);
                            const { id } = data;
                            callback({ id });
                        },
                    );
                } catch (err) {
                    errback(err as Error);
                }
            });
            getUserMediaAndSend(sendTransport, videoTrack)
        });
    }



    const setupRecvTransport = (transportData: any) => {
        if (!device.current) return;
        const recvTransport = device.current.createRecvTransport(transportData);
        recvTransportRef.current = recvTransport;

        recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            console.log('Recv transport connect event fired internally');
            try {
                console.log(`Emitting transportConnect event with id=${recvTransport.id} and dtlsParameters`);
                socket.emit("transportConnect", {
                    dtlsParameters: dtlsParameters,
                    transportId: recvTransport.id,
                    consumer: true
                }, (stat: any) => {
                    console.log("Got response from server for setting dtls on consumer transport", stat)
                    callback()
                })
            } catch (err) {
                console.log("Error occurred", err)
                errback(err as Error)
            }
        });

        return recvTransport;
    };


    const receiveAllVideoFromServer = async () => {
        console.log("Emitting createTransport for consuming ")

        socket.emit('createTransport', { consumer: true }, (data: any) => {
            const recvTRansport = setupRecvTransport(data);
            if (!recvTRansport) return;

            socket.emit('transportConsume', {
                rtpCapabilities: device.current!.rtpCapabilities
            }, async (consumeData: any) => {
                console.log("Ready to consume", consumeData);

                // Create an array to store all consumer operations
                const consumers: any[] = []
                for (const obj of consumeData) {
                    let consumer = await recvTRansport.consume({
                        id: obj.id,
                        producerId: obj.producerId,
                        kind: obj.kind,
                        rtpParameters: obj.rtpParameters,
                    })
                    consumers.push(consumer)
                }

                console.log(consumers)


                // Create a map of userId to track for efficient lookup
                const trackMap = new Map(
                    consumers.map((consumer, index) => [
                        consumeData[index].userId,
                        consumer.track
                    ])
                );
                console.log(trackMap)
                // Single state update with all changes

                for (const obj of consumers) {
                    socket.emit('resumeConsumeTransport', {
                        consumerId: obj.id
                    }, (cb) => {
                        console.log("GOt acknowledged from server ")
                    })
                }

                setParticipants(prevParticipants => {
                    let newP = prevParticipants.map(participant => {
                        const track = trackMap.get(participant.id);
                        if (track) {

                            console.log("Track found for userid=", participant.id)
                            const stream = new MediaStream([track]);

                            if (participant.ref.current) {
                                console.log("Setting src object ")
                                console.log("Track = ", track)
                                participant.ref.current.id = participant.name
                                participant.ref.current.autoplay = true
                                participant.ref.current.srcObject = stream;
                                participant.ref.current.play()
                            }

                            return {
                                ...participant,
                                videoOn: true,
                                track: track
                            };
                        }
                        console.log("Track not found for user ", participant.id)
                        return participant;
                    });
                    console.log(newP)
                    return newP
                });

            });
        })
    }



    const consumeNewlyJoinedConsumer = async (data: any) => {
        if (!device.current || !recvTransportRef.current) {
            console.log("Device or receive transport not ready");
            return;
        }
        console.log("New User joined; Lemme consume him ")
        console.log(data)
        try {
            const consumer = await recvTransportRef.current.consume({
                id: data.id,
                producerId: data.producerId,
                kind: data.kind,
                rtpParameters: data.rtpParameters,
            });

            socket.emit('resumeConsumeTransport', {
                consumerId: consumer.id
            }, (cb) => {
                console.log("Got acknowledged from server");
            });

            setParticipants(prevParticipants => {
                return prevParticipants.map(participant => {
                    if (participant.id === data.userId) {
                        const stream = new MediaStream([consumer.track]);

                        if (participant.ref.current) {
                            participant.ref.current.srcObject = stream;
                            participant.ref.current.autoplay = true;
                            participant.ref.current.play();
                        }

                        return {
                            ...participant,
                            videoOn: true,
                            track: consumer.track
                        };
                    }
                    return participant;
                });
            });
        } catch (error) {
            console.error('Error consuming new producer:', error);
        }
    }

    const onNewProducerAdded = async (data: any) => {
        let { userId, producerId }: { userId: string, producerId: string } = data;
        console.log("Some new producer just get creatd somewhere", data)

        socket.emit('consumeNewUser', {
            rtpCapabilities: device.current!.rtpCapabilities,
            newUserId: userId,
            producerId: producerId
        }, async (consumersInfo: any) => {

            console.log("Consumer created at server")
            console.log(consumersInfo)
            for (const data of consumersInfo) {
                await consumeNewlyJoinedConsumer(data)
            }

        })
    }



    const onNewMemberJoined = async (data: any) => {
        addParticipant(data.userId, data.name)
        console.log("New user just joined;", data)
    }



    const handleConnect = async () => {
        if (!device.current) {
            device.current = new mediasoupClient.Device();
            console.log("initialized device")
        }
        console.log('Socket connected with socket id:', socket.id);
        socket.emit('initialize', { id: id, userId: user?.id },
            (status: any) => {
                console.log(status);
            },
        );
        console.log('Emitting getRTPCapabilities...');
        socket.emit('getRTPCapabilities', null);
    };


    const addParticipant = (id: string, name: string) => {
        setParticipants(prev => [...prev, {
            id,
            name,
            videoOn: false,
            audioOn: false,
            track: undefined,
            ref: React.createRef<HTMLVideoElement>()
        }]);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem("debug", "*")
        }
        if (user == undefined || user == null) return
        if (id == undefined || id == null) return

        addParticipant(user.id, user.name)
        socket.connect()

        socket.on('connect', handleConnect);
        socket.on('RTPCapabilities', handleRTPCapabilities);
        socket.on('newUserJoined', onNewMemberJoined)
        socket.on('newProducer', onNewProducerAdded)

        return () => {
            console.log('Cleaning up socket listeners...');
            socket.off('connect', handleConnect);
            socket.off('RTPCapabilities', handleRTPCapabilities);
            socket.off('newUserJoined', onNewMemberJoined)
            socket.off('newProducer', onNewProducerAdded)

            if (socket.connected) {
                socket.disconnect();
            }

            if (device.current) {
                device.current = null;
            }
        };
    }, [user, id]);

    const handleMyAudioToggle = () => {
        if (user == null || user == undefined) return;
        setParticipants(prev => {
            const index = prev.findIndex(obj => obj.id === user.id);

            return prev.map((participant, i) =>
                i === index
                    ? { ...participant, audioOn: !participant.audioOn }
                    : participant
            );
        });
    };

    const handleMyVideoToggle = async () => {
        if (!user) return;

        const index = participants.findIndex(obj => obj.id === user.id);
        if (index === -1) return;

        const participant = participants[index];
        const isVideoOn = !participant?.videoOn;

        if (isVideoOn) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const videoTrack = stream.getVideoTracks()[0];
                if (!videoTrack) {
                    console.log("Cannot access camera")
                    return
                }

                if (participant?.ref?.current) {
                    participant.ref.current.srcObject = stream;
                }

                setParticipants(prevState => prevState.map(p =>
                    p.id === user.id
                        ? { ...p, videoOn: true, track: videoTrack }
                        : p
                ));

                await sendvideoToServer(videoTrack)
            } catch (error) {
                console.error("Error accessing camera:", error);
            }
        } else {
            if (participant.track) {
                participant.track.stop();
            }
            if (participant.ref?.current) {
                participant.ref.current.srcObject = null;
            }
            setParticipants(prevState => prevState.map(p =>
                p.id === user.id
                    ? { ...p, videoOn: false, track: undefined }
                    : p
            ));
        }
    };




    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-white text-gray-800">
            <ViewParticipants containerRef={containerRef} user={user!} participants={participants} />
            <VideoControls user={user!} participants={participants} setCurrentPage={setCurrentPage} handleMyAudioToggle={handleMyAudioToggle} handleMyVideoToggle={handleMyVideoToggle} />
        </div>
    );
}
