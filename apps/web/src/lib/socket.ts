'use client';

import { io } from 'socket.io-client';

const socket = io('http://localhost:7000', {
    autoConnect: false,
});
export default socket;


function connect_admission_socket(query: Object) {
    const adm_socket = io('http://localhost:7001', {
        autoConnect: false,
        query: query,
        withCredentials: true
    });
    return adm_socket
}

export { connect_admission_socket }
