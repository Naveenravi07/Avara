'use client';

import React, { useState, useRef, useEffect, Consumer } from 'react';
import { ChevronLeft, ChevronRight, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as mediasoupClient from 'mediasoup-client';
import { Transport, TransportOptions } from 'mediasoup-client/lib/types';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import socket from '@/lib/socket';

type Participant = {
    id: string;
    name: string;
    videoOn: boolean;
    audioOn: boolean;
    ref: React.RefObject<HTMLVideoElement>;
    track: MediaStreamTrack | undefined
};

const participantsPerPage = 6;

export default function Component() {
    const { user } = useAuth()
    const { id } = useParams();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const device = useRef<mediasoupClient.Device | null>(null);


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



    const receiveAllVideoFromServer = async () => {
        console.log("Emitting createTransport for consuming ")

        socket.emit('createTransport', { consumer: true }, (data: any) => {
            if (!device.current) return
            const recvTRansport = device.current.createRecvTransport(data);

            // Connect will be triggerd on the first call to recvTransport.consume()
            recvTRansport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                console.log('Recv transport connect event fired internally');
                try {
                    console.log(`Emitting transportConnect event with id=${recvTRansport.id} and dtlsParameters`);
                    socket.emit("transportConnect", {
                        dtlsParameters: dtlsParameters,
                        transportId: recvTRansport.id,
                        consumer: true
                    }, (stat: any) => {
                        console.log("Got response from server for setting dtls on consumer transport", stat)
                        callback()
                    })
                } catch (err) {
                    console.log("Error occured", err)
                    errback(err as Error)
                }
            });

            // Fetching consumer info after consuming each of the producers on room
            socket.emit('transportConsume', {
                rtpCapabilities: device.current.rtpCapabilities,
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

        return () => {
            console.log('Cleaning up socket listeners...');
            socket.off('connect', handleConnect);
            socket.off('RTPCapabilities', handleRTPCapabilities);
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


    useEffect(() => {
        console.log("Participant updated")
    }, [participants])

    ///     UI Controls Start (please just dot touch this)
    const totalPages = Math.ceil(participants.length / participantsPerPage);
    const getGridClass = (count: number) => {
        if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    };
    const handleMouseDown = () => {
        if (containerRef.current) {
            setIsScrolling(true);
            containerRef.current.style.cursor = 'grabbing';
            containerRef.current.style.userSelect = 'none';
        }
    };
    const handleMouseUp = () => {
        if (containerRef.current) {
            setIsScrolling(false);
            containerRef.current.style.cursor = 'grab';
            containerRef.current.style.removeProperty('user-select');
        }
    };
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isScrolling && containerRef.current) {
            containerRef.current.scrollLeft -= e.movementX;
        }
    };
    const currentParticipants = participants.slice(
        currentPage * participantsPerPage,
        (currentPage + 1) * participantsPerPage,
    );
    console.log("currentParticipants = ", currentParticipants)
    const handleNextPage = () => {
        setCurrentPage(prevPage => (prevPage + 1) % totalPages);
    };
    const handlePrevPage = () => {
        setCurrentPage(prevPage => (prevPage - 1 + totalPages) % totalPages);
    };

    ///     UI Controls end 


    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-white text-gray-800">
            <div className="flex-grow overflow-hidden">
                <div
                    ref={containerRef}
                    className="h-full overflow-x-auto scrollbar-hide cursor-grab"
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseUp}
                >
                    <div className={`grid ${getGridClass(currentParticipants.length)} gap-4 h-full p-4`}>
                        {currentParticipants.map((participant, i) => (
                            <div
                                key={participant.id}
                                className="relative bg-gray-200 rounded-lg overflow-hidden shadow-md"
                            >
                                <video
                                    ref={participant.ref}
                                    onLoadedMetadata={async (e) => {
                                        console.log("Video metadata loaded")
                                        console.log(e)
                                        await e.currentTarget.play()
                                    }}
                                    muted={participant.id === user?.id}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-white bg-opacity-80 rounded px-2 py-1">
                                    <span className="text-sm font-medium">{participant.name}</span>
                                    <div className="flex space-x-1">
                                        {participant.audioOn ? (
                                            <Mic className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <MicOff className="h-4 w-4 text-red-600" />
                                        )}
                                        {participant.videoOn ? (
                                            <Video className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <VideoOff className="h-4 w-4 text-red-600" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="h-20 bg-gray-100 flex items-center justify-center space-x-4 px-4 shadow-md">
                <Button variant="outline" size="icon" onClick={handleMyAudioToggle}>
                    {(() => {
                        const isAudioOn = participants.find(obj => obj.id === user?.id)?.audioOn;
                        return isAudioOn ? (
                            <Mic className="h-4 w-4 text-green-600" />
                        ) : (
                            <MicOff className="h-4 w-4 text-red-600" />
                        );
                    })()}
                </Button>
                <Button variant="outline" size="icon" onClick={handleMyVideoToggle}>
                    {(() => {
                        const isVideoOn = participants.find(obj => obj.id === user?.id)?.videoOn;
                        return isVideoOn ? (
                            <Video className="h-4 w-4 text-green-600" />
                        ) : (
                            <VideoOff className="h-4 w-4 text-red-600" />
                        );
                    })()}
                </Button>

                <Button variant="secondary" size="icon" onClick={handlePrevPage} disabled={totalPages <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={handleNextPage} disabled={totalPages <= 1}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
