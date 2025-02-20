import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Redis } from 'ioredis';
import { WsException } from '@nestjs/websockets';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { Socket } from 'socket.io';

@Injectable()
export class WsSessionGuard implements CanActivate {
    private redisClient: Redis;

    constructor(private readonly redis: RedisService) {
        this.redisClient = redis.getOrThrow("publisher")
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const client: Socket = context.switchToWs().getClient<Socket>();
        const cookies: string | undefined = client.handshake?.headers?.cookie;

        if (!cookies) {
            throw new WsException('No cookies found');
        }

        let sessionId = extractSessionId(cookies)
        if (!sessionId) {
            throw new WsException('Unauthorized: No session ID provided');
        }

        const session = await this.redisClient.get(`avara-login:${sessionId}`);
        if (!session) {
            throw new WsException('Unauthorized: Invalid session ID');
        }

        const sessionData = JSON.parse(session);
        let { id, name }: { id: string, name: string } = sessionData.passport.user
        if (!id) {
            throw new WsException('Unauthorized: No user found in session');
        }
        client.data.userId = id
        client.data.userName = name
        return true;
    }
}


function extractSessionId(cookieStr: string): string | null {
    const sessionMatch: RegExpMatchArray | null = cookieStr.match(/coolSession=([^;]*)/);
    let sessionId: string | null = sessionMatch ? decodeURIComponent(sessionMatch[1] ?? "") : null;

    if (!sessionId) {
        throw new WsException('Session ID not found in cookies');
    }

    if (sessionId.startsWith('s:')) {
        sessionId = sessionId.slice(2).split('.')[0] ?? null;
    } else {
        sessionId = sessionId.split('.')[0] ?? null;
    }
    return sessionId
}
