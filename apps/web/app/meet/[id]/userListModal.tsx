import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input" // Import Input component
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ban, MoreVertical, UserX, Loader2, Search } from "lucide-react";
import { Participant } from "../types";
import { type Socket } from "socket.io-client";
import { useEffect, useState } from "react";

export function UserManagementModal({
    open = false,
    onOpenChange,
    users,
    socket
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    users: Participant[]
    socket: Socket
}) {

    const [searchQuery, setSearchQuery] = useState<string>("")
    const [loading, setLoading] = useState<boolean>(false);

    const handleKickUser = (userId: string) => {
        console.log("Kicking user:", userId);
    };

    const handleBanUser = (userId: string) => {
        console.log("Banning user:", userId);
    };

    const displayedUsers = searchQuery
        ? users.filter((user) => user.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : users;


    const PerformSearch = (val: string) => {
        setSearchQuery(val)
    }

    useEffect(() => {
        if (socket.connected === false) return;
        if (!open) return;
    }, [socket.connected, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-zinc-900 text-zinc-100 border-zinc-800">
                <DialogHeader>
                    <DialogTitle className="text-zinc-100">Manage Users</DialogTitle>
                </DialogHeader>
                <div className="relative mb-4">
                    <Input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => PerformSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-400 focus:ring-zinc-500 focus:border-zinc-500"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
                </div>
                <ScrollArea className="h-[400px] pr-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {displayedUsers.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="bg-zinc-400">
                                            <AvatarImage src={user.imgSrc} />
                                            <AvatarFallback className="text-zinc-900">{user.name[0]}</AvatarFallback>
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
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
