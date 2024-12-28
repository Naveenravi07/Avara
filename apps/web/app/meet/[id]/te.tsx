'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as mediasoupClient from 'mediasoup-client';
import { Transport } from 'mediasoup-client/lib/types';
import { useParams } from 'next/navigation';
import useAuth from '@/hooks/useAuth';
import socket from '@/lib/socket';

type Participant = {
    id: string;
    name: string;
    videoOn: boolean;
    audioOn: boolean;
    track: React.RefObject<HTMLVideoElement>;
};

export default function Component() {
    const { id } = useParams();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [myAudioOn, setMyAudioOn] = useState(true);
    const [myVideoOn, setMyVideoOn] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    let device = useRef<mediasoupClient.Device>(new mediasoupClient.Device());
    const { user } = useAuth();

    const addParticipant = (id: string, name: string) => {
        setParticipants(prev => [...prev, {
            id,
            name,
            videoOn: true,
            audioOn: true,
            track: useRef<HTMLVideoElement>(null)
        }]);
    };

    // Rest of your mediasoup logic remains the same until the render part

    const participantsPerPage = 6;
    const totalPages = Math.ceil(participants.length / participantsPerPage);
    const getGridClass = (count: number) => {
        if (count <= 2) return 'grid-cols-1 sm:grid-cols-2';
        if (count <= 4) return 'grid-cols-2';
        if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
    };

    const currentParticipants = participants.slice(
        currentPage * participantsPerPage,
        (currentPage + 1) * participantsPerPage
    );

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-white text-gray-800">
            <div className="flex-grow overflow-hidden">
                <div className={`grid ${getGridClass(currentParticipants.length)} gap-4 h-full p-4`}>
                    {currentParticipants.map((participant) => (
                        <div key={participant.id} className="relative bg-gray-200 rounded-lg overflow-hidden shadow-md">
                            {participant.videoOn ? (
                                <video
                                    ref={participant.track}
                                    className="w-full h-full object-cover"
                                    autoPlay
                                    muted
                                    playsInline
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                    <span className="text-4xl text-gray-600">{participant.name[0]}</span>
                                </div>
                            )}
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
            <div className="h-20 bg-gray-100 flex items-center justify-center space-x-4 px-4 shadow-md">
                <Button variant="outline" size="icon" onClick={() => setMyAudioOn(!myAudioOn)}>
                    {myAudioOn ? (
                        <Mic className="h-4 w-4 text-green-600" />
                    ) : (
                        <MicOff className="h-4 w-4 text-red-600" />
                    )}
                </Button>
                <Button variant="outline" size="icon" onClick={() => setMyVideoOn(!myVideoOn)}>
                    {myVideoOn ? (
                        <Video className="h-4 w-4 text-green-600" />
                    ) : (
                        <VideoOff className="h-4 w-4 text-red-600" />
                    )}
                </Button>
                <Button variant="secondary" size="icon" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
