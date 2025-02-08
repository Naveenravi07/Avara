'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import socket from '@/lib/socket';
import { Participant } from "../types"
import { ViewParticipants } from './participants';
import { VideoControls } from './controls';
import { MediasoupHandler } from './mediasoup';


export default function Component() {
    const { user } = useAuth()
    const { id } = useParams();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const device = useRef<mediasoupClient.Device | null>(null);
    const ms_handler = useRef<MediasoupHandler | null>(null);

    const getAllConnectedUserInformation = async () => {
        socket.emit('getAllUsersInRoom', null, (response: any) => {
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

            setParticipants((prevParticipants) => [...prevParticipants, ...partis]);
        })
    }


    const handleRTPCapabilities = async (data: any) => {
        await ms_handler.current?.initializeDevice(data.data)
        await getAllConnectedUserInformation()
        await receiveAllVideoFromServer()
    };


    const sendvideoToServer = async (videoTrack: MediaStreamTrack) => {
        await ms_handler.current?.createSendTransport(videoTrack);
    }


    const receiveAllVideoFromServer = async () => {
        await ms_handler.current?.createRecvTransport()
        let trackMap = await ms_handler.current?.consumeAllVideoStreams()


        setParticipants(prevParticipants => {
            let newP = prevParticipants.map(participant => {
                const track = trackMap?.get(participant.id);
                if (track) {

                    const stream = new MediaStream([track]);

                    if (participant.ref.current) {
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
                return participant;
            });
            return newP
        });
    }



    const consumeNewlyJoinedConsumer = async (data: any) => {
        let track = await ms_handler.current?.consumeNewProducer(data.producerId, data.userId);
        if (!track) {
            return;
        }
        setParticipants(prevParticipants => {
            return prevParticipants.map(participant => {
                if (participant.id === data.userId) {
                    const stream = new MediaStream([track]);

                    if (participant.ref.current) {
                        participant.ref.current.id = participant.name
                        participant.ref.current.srcObject = stream;
                        participant.ref.current.autoplay = true;
                        participant.ref.current.play();
                    }

                    return {
                        ...participant,
                        videoOn: true,
                        track: track
                    };
                }
                return participant;
            });
        });
    }

    const onNewProducerAdded = async (data: any) => {
        let { userId, producerId }: { userId: string, producerId: string } = data;
        await consumeNewlyJoinedConsumer({userId,producerId})
    }



    const onNewMemberJoined = async (data: any) => {
        addParticipant(data.userId, data.name)
    }



    const handleConnect = async () => {
        if (!device.current) {
            device.current = new mediasoupClient.Device();
        }
        socket.emit('initialize', { id: id, userId: user?.id },
            (status: any) => {
            },
        );
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

        if (ms_handler.current == null) {
            ms_handler.current = new MediasoupHandler()
        }
        addParticipant(user.id, user.name)
        socket.connect()

        socket.on('connect', handleConnect);
        socket.on('RTPCapabilities', handleRTPCapabilities);
        socket.on('newUserJoined', onNewMemberJoined)
        socket.on('newProducer', onNewProducerAdded)

        return () => {
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

    const handleMyScreenVideoToggle = async () => {
        if (!user) return;

        const index = participants.findIndex(obj => obj.id === user.id);
        if (index === -1) return;

        const participant = participants[index];
        const isVideoOn = !participant?.videoOn;

        if (isVideoOn) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const videoTrack = stream.getVideoTracks()[0];
                if (!videoTrack) {
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
    }



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
            <VideoControls
                user={user!}
                participants={participants}
                setCurrentPage={setCurrentPage}
                handleMyAudioToggle={handleMyAudioToggle}
                handleMyVideoToggle={handleMyVideoToggle}
                handleMyScreenVideoToggle={handleMyScreenVideoToggle}
            />
        </div>
    );
}
