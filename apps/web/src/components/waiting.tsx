import * as React from "react"
import { Mic, MicOff, Video, VideoOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { adm_socket } from "@/lib/socket"
import useAuth from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

type WaitingRoomModalProps = {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    roomId: string
}

export function WaitingRoomModal({
    open = false,
    onOpenChange,
    roomId
}: WaitingRoomModalProps) {

    const [isMicOn, setIsMicOn] = React.useState(true)
    const [isVideoOn, setIsVideoOn] = React.useState(true)
    const { user } = useAuth()
    const router = useRouter()
    const { toast } = useToast()

    const handleConnect = async () => {
        if (!user) return
        adm_socket.emit('initialize', { userId: user.id, roomId: roomId }, (status: boolean) => {
            if (status == false) {
                toast({
                    title: "You are trying to join an invalid room, exiting..",
                    variant: "destructive"
                })
                router.push('/')
            } else {
                adm_socket.emit("waitingAdd")
            }
        })
    }

    const handleAdmissionApproval = async (data: string) => {
        if (data.toLowerCase() == "ok") {
            router.push(`/meet/${roomId}`)
        }
    }

    const handleAdmissionRejected = async (data: string) => {
        if (data.toLowerCase() == "ok") {
            toast({
                title: "The creator rejected your join request",
                variant:"destructive"
            })
            router.push("/")
            onOpenChange(false)
        }
    }

    React.useEffect(() => {
        if (!user) return

        adm_socket.connect()
        adm_socket.on('connect', handleConnect)
        adm_socket.on('admission-approval', handleAdmissionApproval)
        adm_socket.on('admission-rejected', handleAdmissionRejected)

        return (() => {
            adm_socket.off('connect', handleConnect)
            adm_socket.off('admission-approval', handleAdmissionApproval)
            adm_socket.off('admission-rejected', handleAdmissionRejected)
            adm_socket.disconnect()
            adm_socket.close()
        })
    }, [user])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-black border-white/20">
                <DialogHeader>
                    <DialogTitle className="text-white">Waiting to accept admit request</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6">
                    <div className="relative aspect-video bg-zinc-900 rounded-lg border border-white/20">
                        {/* Video preview placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center text-white/50">
                            {isVideoOn ? "Camera Preview" : "Camera Off"}
                        </div>
                        {/* Control buttons */}
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                                onClick={() => setIsMicOn(!isMicOn)}
                            >
                                {isMicOn ? <Mic className="h-4 w-4 text-white" /> : <MicOff className="h-4 w-4 text-red-500" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-10 w-10 rounded-full bg-zinc-900 border-white/20 hover:bg-zinc-800"
                                onClick={() => setIsVideoOn(!isVideoOn)}
                            >
                                {isVideoOn ? <Video className="h-4 w-4 text-white" /> : <VideoOff className="h-4 w-4 text-red-500" />}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-white">Microphone Input</label>
                            <Select>
                                <SelectTrigger className="w-full bg-zinc-900 border-white/20 text-white">
                                    <SelectValue placeholder="Select microphone" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/20">
                                    <SelectItem value="default">Default Microphone</SelectItem>
                                    <SelectItem value="built-in">Built-in Microphone</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm text-white">Camera Input</label>
                            <Select>
                                <SelectTrigger className="w-full bg-zinc-900 border-white/20 text-white">
                                    <SelectValue placeholder="Select camera" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-white/20">
                                    <SelectItem value="default">Default Camera</SelectItem>
                                    <SelectItem value="built-in">Built-in Camera</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

