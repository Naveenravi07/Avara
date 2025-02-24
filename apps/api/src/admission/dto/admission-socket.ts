import { Socket } from "socket.io";

export interface ClientData {
    roomId: string;
    userId: string;
    userName: string,
    pfpUrl: string | null,
    silentDisconnect: boolean 
}

export interface CustomSocket extends Socket {
    data: ClientData;
}

