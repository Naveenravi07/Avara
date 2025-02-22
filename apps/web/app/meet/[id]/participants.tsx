import { Mic, MicOff, Video, VideoOff } from "lucide-react"
import { Participant,participantsPerPage } from "../types"
import { User } from "@/types/user/user";
import { useState } from "react";



export function ViewParticipants({ containerRef, participants, user }: { containerRef: React.RefObject<HTMLDivElement>, participants: Participant[], user: User }) {
    const totalPages = Math.ceil(participants.length / participantsPerPage);
    const [isScrolling, setIsScrolling] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

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
    const handleNextPage = () => {
        setCurrentPage(prevPage => (prevPage + 1) % totalPages);
    };
    const handlePrevPage = () => {
        setCurrentPage(prevPage => (prevPage - 1 + totalPages) % totalPages);
    };
    ///     UI Controls end   


    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };


    return (
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
                                className={`w-full h-full object-cover ${participant.videoOn ? 'block' : 'hidden'}`}
                            />
                            
                            {/* Avatar shown when video is off */}
                            {!participant.videoOn && (
                                <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center">
                                        <span className="text-2xl font-semibold text-gray-800">
                                            {getInitials(participant.name)}
                                        </span>
                                    </div>
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
        </div>
    )
}
