import { Button } from "@/components/ui/button";
import { Participant, participantsPerPage } from "../types"
import { ChevronLeft, ChevronRight, Mic, MicOff, Settings, Users, Video, VideoOff } from 'lucide-react';
import { User } from "@/types/user/user";
import { cn } from "@/lib/utils";

interface VideoControlsProps {
    participants: Participant[];
    handleMyAudioToggle: () => Promise<boolean>;
    handleMyVideoToggle: () => Promise<boolean>;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    user: User;
    handleParticipantsButtonClick: () => void;
    hanleSettingsButtonClick: () => void;
    notifications: string[];
    isVideoLoading: boolean;
    isAudioLoading: boolean;
}

export function VideoControls({
    participants,
    handleMyAudioToggle,
    handleMyVideoToggle,
    setCurrentPage,
    user,
    handleParticipantsButtonClick,
    hanleSettingsButtonClick,
    notifications,
    isVideoLoading,
    isAudioLoading
}: VideoControlsProps) {
    const totalPages = Math.ceil(participants.length / participantsPerPage);
    const handleNextPage = () => {
        setCurrentPage(prevPage => (prevPage + 1) % totalPages);
    };
    const handlePrevPage = () => {
        setCurrentPage(prevPage => (prevPage - 1 + totalPages) % totalPages);
    };

    const currentParticipant = participants.find(p => p.id === user.id);

    return (
        <div className="h-20 bg-gray-100 flex items-center justify-center space-x-4 px-4 shadow-md">
            <Button
                variant="outline"
                size="icon"
                className="relative h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                onClick={() => handleMyAudioToggle()}
                disabled={isAudioLoading}
            >
                {isAudioLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : currentParticipant?.audioOn ? (
                    <Mic className="h-4 w-4 text-white" />
                ) : (
                    <MicOff className="h-4 w-4 text-red-500" />
                )}
            </Button>
            <Button
                variant="outline"
                size="icon"
                className="relative h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                onClick={() => handleMyVideoToggle()}
                disabled={isVideoLoading}
            >
                {isVideoLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : currentParticipant?.videoOn ? (
                    <Video className="h-4 w-4 text-white" />
                ) : (
                    <VideoOff className="h-4 w-4 text-red-500" />
                )}
            </Button>

            <div className="relative">
                <Button onClick={handleParticipantsButtonClick} 
                        className="relative h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                        variant="link" size="icon">
                    <Users className="h-4 w-4 text-green-600" />
                </Button>
                {notifications.includes('userList') && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
            </div>
            <Button onClick={hanleSettingsButtonClick} 
                    className="relative h-10 w-10 rounded-full bg-gray-900 border-white/20 hover:bg-zinc-800" variant="link" size="icon">
                <Settings className="h-4 w-4 text-green-600" />
            </Button>

            <Button variant="secondary" size="icon" onClick={handlePrevPage} disabled={totalPages <= 1}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="icon" onClick={handleNextPage} disabled={totalPages <= 1}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}
