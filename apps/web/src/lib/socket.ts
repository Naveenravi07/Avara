'use client';

import { io } from 'socket.io-client';

const socket = io('http://localhost:7000', {
    autoConnect: false,
});
export default socket;

