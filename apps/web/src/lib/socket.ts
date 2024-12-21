"use client"

import { io } from "socket.io-client"; 
const socket  = io("ws://localhost:7000", { 
    autoConnect:true
});
export default socket
