import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException, Error)
export class WebsocketExceptionsFilter extends BaseWsExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        console.log("WebSocket Exception Filter Triggered:", exception);
        const client = host.switchToWs().getClient<Socket>();

        if (exception instanceof WsException) {
            const error = exception.getError();
            const message = typeof error === 'string' ? error : "Error occured"

            client.emit('error', {
                status: 'error',
                message: message
            });
            return;
        }

        const message = exception instanceof Error ? exception.message : 'An unexpected error occurred';
        
        client.emit('error', {
            status: 'error',
            message: message
        });
    }
}
