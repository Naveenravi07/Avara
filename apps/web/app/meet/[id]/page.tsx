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
        await ms_handler.current?.createSendTransport()
        .then(()=>console.log("Send Transport Created and attached events globally"))
        .catch(()=>console.log("Send Transport Creation failed"))
    };


    const sendvideoToServer = async (videoTrack: MediaStreamTrack) => {
        await ms_handler.current?.produceVideo(videoTrack)
    }

    const sendAudioToServer = async(audioTrack:MediaStreamTrack)=>{
        await ms_handler.current?.produceAudio(audioTrack)
    }


    const receiveAllVideoFromServer = async () => {
        await ms_handler.current?.createRecvTransport();
        let trackMap = await ms_handler.current?.consumeAllVideoStreams();
        console.log(trackMap);

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
        let { producerId, userId, kind } = data;
        let track = await ms_handler.current?.consumeNewProducer(producerId, userId);

        if (!track) {
            return;
        }
        setParticipants(prevParticipants => {
            return prevParticipants.map(participant => {
                if (participant.id === data.userId) {
                    const stream = new MediaStream();

                    if (participant.tracks.length > 0) {
                        stream.addTrack(participant.tracks[0]!);
                    }

                    stream.addTrack(track);

                    if (participant.ref.current) {
                        participant.ref.current.id = participant.name;
                        participant.ref.current.srcObject = stream;
                        participant.ref.current.autoplay = true;
                        participant.ref.current.play();
                    }

                    if (kind === "video") {
                        return {
                            ...participant,
                            videoOn: true,
                            track: track
                        };
                    } else {
                        return {
                            ...participant,
                            audioOn: true,
                            track: track
                        };
                    }
                }
                return participant;
            });
        });
    }

    const onNewProducerAdded = async (data: any) => {
        let { userId, producerId,kind }: { userId: string, producerId: string,kind:string} = data;
        await consumeNewlyJoinedConsumer({userId,producerId,kind})
    }

    const onProducerClosed = async (data: any) => {
        console.log("Some producer got closed", data);
        let { producerId, userId, kind }: { producerId: string, userId: string, kind: string } = data;

        setParticipants((prevPartis) => {
            let newPartis = prevPartis.map((p) => {
                if (p.id === userId) {
                    console.log(p);
                    console.log(kind);
                    let updatedVideoOn = p.videoOn;
                    let updatedAudioOn = p.audioOn;

                    if (kind === "video") {
                        updatedVideoOn = false; 
                    } else {
                        updatedAudioOn = false;
                    }
                    const remainingTracks = p.tracks.filter(track => track.kind !== kind);
                    const stream = new MediaStream();
                    p.tracks.forEach((track) => {
                        if (track.kind === kind) {
                            track.stop();
                        } else {
                            stream.addTrack(track);
                        }
                    });

                    // Update the video element if it exists
                    if (p.ref.current) {
                        p.ref.current.srcObject = stream; // Update the srcObject to the new stream
                        p.ref.current.play(); // Play the new stream (if any)
                    }

                    return {
                        ...p,
                        videoOn: updatedVideoOn,
                        audioOn: updatedAudioOn,
                        tracks: remainingTracks,
                    };
                }
                return p;
            });
            return newPartis;
        });
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
            tracks: [],
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
        socket.on('producerClosed',onProducerClosed)

        return () => {
            socket.off('connect', handleConnect);
            socket.off('RTPCapabilities', handleRTPCapabilities);
            socket.off('newUserJoined', onNewMemberJoined)
            socket.off('newProducer', onNewProducerAdded)
            socket.off('producerClosed',onProducerClosed)


            if (socket.connected) {
                socket.disconnect();
            }

            if (device.current) {
                device.current = null;
            }
        };
    }, [user, id]);


    const handleMyAudioToggle =  async() => {
        if (user == null || user == undefined) return;
        const index = participants.findIndex(obj => obj.id === user.id);
        if (index === -1) return;

        const participant = participants[index];
        const isAudioOn = !participant?.audioOn;

        if(isAudioOn){
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const audioTrack = stream.getAudioTracks()[0];
            if(!audioTrack){
                return
            }
            await ms_handler.current?.produceAudio(audioTrack)
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

    const handleMyScreenVideoToggle = async () => {
      
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

            await ms_handler.current?.StopProucingVideo();
            if (participant.tracks) {
                participant.tracks.filter((ob)=>ob.kind=="video").map((t)=>t.stop())
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
