import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Ban, MoreVertical, UserX } from "lucide-react"
import { User } from "../types"
import { type Socket } from "socket.io-client"
import { useEffect, useState } from "react"

export function UserManagementModal({
    open = false,
    onOpenChange,
    socket
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    socket: Socket
}) {


    const [users,setUsers] = useState<User[]>([])

    const handleKickUser = (userId: string) => {
        console.log("Kicking user:", userId)
    }

    const handleBanUser = (userId: string) => {
        console.log("Banning user:", userId)
    }


    const getAllUsersInRoom = async () => {
        socket.emit('getAllUsersInRoom', null, (response: any) => {
            const userList: User[] = response
                .map((o: User) => {
                    return {
                        imgSrc: o.imgSrc,
                        id: o.id,
                        name: o.name
                    }
                })
            console.log(userList)
            setUsers(userList)
        })
    }

    useEffect(()=>{
        if(socket.connected == false) return
        getAllUsersInRoom()
    },[socket.connected,open])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-zinc-900 text-zinc-100 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-100">Manage Users</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.imgSrc} />
                                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium">{user.name}</span>
                                        <span className={`text-xs`}>
                                            Online
                                        </span>
                                    </div>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-zinc-800 border-zinc-700 text-zinc-100">
                                        <DropdownMenuItem
                                            onClick={() => handleKickUser(user.id)}
                                            className="text-red-400 focus:text-red-400 focus:bg-zinc-700"
                                        >
                                            <UserX className="mr-2 h-4 w-4" />
                                            Kick User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleBanUser(user.id)}
                                            className="text-red-400 focus:text-red-400 focus:bg-zinc-700"
                                        >
                                            <Ban className="mr-2 h-4 w-4" />
                                            Ban User
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
