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
import { UserManagementModal } from './userListModal';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from "next/navigation"


export default function Component() {
    const { user } = useAuth()
    const { id } = useParams();
    const router = useRouter()
    const [participants, setParticipants] = useState<Participant[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const device = useRef<mediasoupClient.Device | null>(null);
    const ms_handler = useRef<MediasoupHandler | null>(null);
    const [P_Popup, setP_Popup] = useState(false)
    const { toast } = useToast()

    const getAllConnectedUserInformation = async () => {
        socket.emit('getAllUsersInRoom', null, (response: any) => {
            const partis: Participant[] = response
                .filter((obj: any) => obj.id !== user?.id)
                .map((obj: any) => ({
                    id: obj.id,
                    name: obj.name,
                    videoOn: false,
                    audioOn: false,
                    tracks: [],
                    ref: React.createRef<HTMLVideoElement>(),
                    imgSrc: obj.imgSrc
                }));

            setParticipants((prevParticipants) => [...prevParticipants, ...partis]);
        })
    }

    const handleRTPCapabilities = async (data: any) => {
        await ms_handler.current?.initializeDevice(data.data)
        await getAllConnectedUserInformation()
        await receiveAllVideoFromServer()
        await ms_handler.current?.createSendTransport()
            .then(() => console.log("Send Transport Created and attached events globally"))
            .catch(() => console.log("Send Transport Creation failed"))
    };



    const receiveAllVideoFromServer = async () => {
        await ms_handler.current?.createRecvTransport();
        let trackMap = await ms_handler.current?.consumeAllVideoStreams();

        setParticipants(prevParticipants => {
            let newP = prevParticipants.map(participant => {
                const tracks = trackMap?.get(participant.id);
                if (tracks) {
                    const stream = new MediaStream();

                    tracks.forEach(track => {
                        stream.addTrack(track);
                    });

                    if (participant.ref.current) {
                        participant.ref.current.id = participant.name;
                        participant.ref.current.autoplay = true;
                        participant.ref.current.srcObject = stream;
                        participant.ref.current.play();
                    }

                    return {
                        ...participant,
                        videoOn: tracks.some(track => track.kind === "video"),
                        audioOn: tracks.some(track => track.kind === "audio"),
                        tracks: tracks
                    };
                }
                return participant;
            });
            return newP;
        });
    }



    const consumeNewlyJoinedConsumer = async (data: any) => {
        const { producerId, userId, kind } = data;
        try {
            const track = await ms_handler.current?.consumeNewProducer(producerId, userId);
            if (!track) {
                console.warn("No track received from consumeNewProducer");
                return;
            }
            setParticipants(prevParticipants => {
                return prevParticipants.map(participant => {
                    if (participant.id !== userId) {
                        return participant;
                    }
                    const updatedTracks = [...(participant.tracks || []), track];
                    try {
                        const stream = new MediaStream();
                        updatedTracks.forEach(t => stream.addTrack(t));

                        if (participant.ref?.current) {
                            participant.ref.current.id = participant.name;
                            participant.ref.current.srcObject = stream;
                            participant.ref.current.autoplay = true;

                            if (participant.ref.current.paused) {
                                participant.ref.current.play().catch(err =>
                                    console.error("Error playing stream:", err)
                                );
                            }
                        }

                        return {
                            ...participant,
                            videoOn: kind === "video" ? true : participant.videoOn,
                            audioOn: kind === "audio" ? true : participant.audioOn,
                            tracks: updatedTracks,
                        };
                    } catch (err) {
                        console.error("Error setting up MediaStream:", err);
                        return participant;
                    }
                });
            });
        } catch (err) {
            console.error("Error in consumeNewlyJoinedConsumer:", err);
        }
    };


    const onNewProducerAdded = async (data: any) => {
        let { userId, producerId, kind }: { userId: string, producerId: string, kind: string } = data;
        await consumeNewlyJoinedConsumer({ userId, producerId, kind })
    }

    const onProducerClosed = async (data: any) => {
        const { _producerId, userId, kind }: { producerId: string; userId: string; kind: string } = data;

        setParticipants((prevPartis) => {
            const userIndex = prevPartis.findIndex(p => p.id === userId);
            if (userIndex === -1) return prevPartis;

            return prevPartis.map(p => {
                if (p.id !== userId) return p;
                const tracks = Array.isArray(p.tracks) ? p.tracks : [];

                if (tracks.length === 0) {
                    return {
                        ...p,
                        videoOn: kind === "video" ? false : p.videoOn,
                        audioOn: kind === "audio" ? false : p.audioOn,
                    };
                }

                const remainingTracks = tracks.filter((track) => {
                    if (track.kind === kind) {
                        try {
                            track.stop();
                        } catch (err) {
                            console.error("Error stopping track:", err);
                        }
                        return false;
                    }
                    return true;
                });

                try {
                    if (remainingTracks.length > 0) {
                        const stream = new MediaStream();
                        remainingTracks.forEach((track) => stream.addTrack(track));

                        if (p.ref?.current) {
                            p.ref.current.srcObject = stream;
                            if (p.ref.current.paused) {
                                p.ref.current.play().catch(err =>
                                    console.error("Error playing stream:", err)
                                );
                            }
                        }
                    } else if (p.ref?.current) {
                        p.ref.current.srcObject = null;
                    }
                } catch (err) {
                    console.error("Error handling MediaStream:", err);
                }

                return {
                    ...p,
                    videoOn: kind === "video" ? false : p.videoOn,
                    audioOn: kind === "audio" ? false : p.audioOn,
                    tracks: remainingTracks,
                };
            });
        });
    };


    const onNewMemberJoined = async (data: any) => {
        addParticipant(data.userId, data.name, data.imgSrc)
        toast({ title: `${data.name} Just joined` })
    }

    const onUserLeave = async (data: any) => {
        let { id, name }: { id: string, name: string } = data
        toast({ title: `${name} Just left` })
        setParticipants((prevPartis) => prevPartis.filter((p) => p.id != id))
    }


    const handleConnect = async () => {
        console.log("Connection success")
        if (!device.current) {
            device.current = new mediasoupClient.Device();
        }
        socket.emit('initialize', { id: id, userId: user?.id },
            (status: boolean) => {
                console.log("Got status of initialize = ",status);
                if(status == false){
                    toast({
                        title:"Meet dosent exist",
                        variant:"destructive"
                    })
                    router.push("/")
                }else{
                    socket.emit('getRTPCapabilities', null);
                }
            },
        );
    };


    const addParticipant = (id: string, name: string, imgSrc: string | undefined) => {
        setParticipants(prev => [...prev, {
            id,
            name,
            videoOn: false,
            audioOn: false,
            tracks: [],
            ref: React.createRef<HTMLVideoElement>(),
            imgSrc: imgSrc
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
        addParticipant(user.id, user.name, user.pfpUrl ?? undefined)
        socket.connect()

        socket.on('connect', handleConnect);
        socket.on('RTPCapabilities', handleRTPCapabilities);
        socket.on('newUserJoined', onNewMemberJoined)
        socket.on('userLeft', onUserLeave)
        socket.on('newProducer', onNewProducerAdded)
        socket.on('producerClosed', onProducerClosed)

        return () => {
            socket.off('connect', handleConnect);
            socket.off('RTPCapabilities', handleRTPCapabilities);
            socket.off('newUserJoined', onNewMemberJoined)
            socket.off('newProducer', onNewProducerAdded)
            socket.off('userLeft', onUserLeave)
            socket.off('producerClosed', onProducerClosed)


            if (socket.connected) {
                socket.disconnect();
            }

            if (device.current) {
                device.current = null;
            }
        };
    }, [user, id]);


    const handleMyAudioToggle = async () => {
        if (user == null || user == undefined) return;
        const index = participants.findIndex(obj => obj.id === user.id);
        if (index === -1) return;

        const participant = participants[index];
        const isAudioOn = !participant?.audioOn;

        if (isAudioOn) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                return
            }
            await ms_handler.current?.produceAudio(audioTrack)
            console.log("Produced audio")
        } else {
            await ms_handler.current?.StopProucingAudio()
        }

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

                await ms_handler.current?.produceVideo(videoTrack)
            } catch (error) {
                console.error("Error accessing camera:", error);
            }
        } else {

            await ms_handler.current?.StopProucingVideo();
            if (participant.tracks) {
                participant.tracks.filter((ob) => ob.kind == "video").map((t) => t.stop())
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
            <UserManagementModal users={participants} socket={socket} open={P_Popup} onOpenChange={setP_Popup} />
            <VideoControls
                user={user!}
                participants={participants}
                setCurrentPage={setCurrentPage}
                handleMyAudioToggle={handleMyAudioToggle}
                handleMyVideoToggle={handleMyVideoToggle}
                handleParticipantsButtonClick={() => { setP_Popup(true) }}
            />
        </div>
    );
}
