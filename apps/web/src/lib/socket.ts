'use client';

import { io } from 'socket.io-client';

const socket = io('http://localhost:7000', {
    autoConnect: false,
});
export default socket;


const adm_socket = io('http://localhost:7001', {
    autoConnect: false,
});

export {adm_socket}
