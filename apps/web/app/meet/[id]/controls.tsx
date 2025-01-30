import { Button } from "@/components/ui/button";
import { Participant, participantsPerPage } from "../types"
import { ChevronLeft, ChevronRight, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { User } from "@/types/user/user";

export function VideoControls({ participants, handleMyAudioToggle, handleMyVideoToggle, setCurrentPage, user }
    : {
        setCurrentPage: React.Dispatch<React.SetStateAction<number>>, participants: Participant[], user: User, handleMyAudioToggle: () => void, handleMyVideoToggle: () => Promise<void>
    }
) {
    const totalPages = Math.ceil(participants.length / participantsPerPage);
    const handleNextPage = () => {
        setCurrentPage(prevPage => (prevPage + 1) % totalPages);
    };
    const handlePrevPage = () => {
        setCurrentPage(prevPage => (prevPage - 1 + totalPages) % totalPages);
    };
    return (
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

    )
}
