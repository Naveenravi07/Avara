import { Button } from "@/components/ui/button";
import { Participant, participantsPerPage } from "../types"
import { ChevronLeft, ChevronRight, Copy, Mic, MicOff, Settings, Users, Video, VideoOff } from 'lucide-react';
import { User } from "@/types/user/user";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    meetingId: string;
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
    isAudioLoading,
    meetingId
}: VideoControlsProps) {
    const totalPages = Math.ceil(participants.length / participantsPerPage);
    const handleNextPage = () => {
        setCurrentPage(prevPage => (prevPage + 1) % totalPages);
    };
    const handlePrevPage = () => {
        setCurrentPage(prevPage => (prevPage - 1 + totalPages) % totalPages);
    };

    const currentParticipant = participants.find(p => p.id === user.id);

    const copyMeetingId = async () => {
        try {
            await navigator.clipboard.writeText(meetingId);
            toast({
                title: "Meeting ID copied to clipboard",
                description: meetingId,
            });
        } catch (err) {
            toast({
                title: "Failed to copy meeting ID",
                variant: "destructive",
            });
        }
    };

    const shortMeetingId = meetingId.slice(0, 8) + "...";

    return (
        <div className="h-20 bg-gray-100 flex items-center justify-between px-4 shadow-md">
            <div className="flex flex-col items-start space-y-1 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                <div className="text-xs text-gray-500">Meeting ID:</div>
                <div className="flex items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger>
                            <span className="text-xs font-mono text-gray-500">{shortMeetingId}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-mono">{meetingId}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={copyMeetingId}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
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
                    <Button 
                        onClick={handleParticipantsButtonClick} 
                        className="relative h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                        variant="link" 
                        size="icon"
                    >
                        <Users className="h-4 w-4 text-green-600" />
                    </Button>
                    {notifications.includes('userList') && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                </div>
                <Button 
                    onClick={hanleSettingsButtonClick} 
                    className="relative h-10 w-10 rounded-full bg-gray-900 border-white/20 hover:bg-zinc-800" 
                    variant="link" 
                    size="icon"
                >
                    <Settings className="h-4 w-4 text-green-600" />
                </Button>
            </div>

            <div className="flex items-center space-x-2">
                <Button variant="secondary" size="icon" onClick={handlePrevPage} disabled={totalPages <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" onClick={handleNextPage} disabled={totalPages <= 1}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
