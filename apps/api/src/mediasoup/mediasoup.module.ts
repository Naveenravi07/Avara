import { Module } from '@nestjs/common';
import { MediasoupGateway } from './mediasoup.gateway';
import { MediasoupService } from './mediasoup.service';
import { SessionSerializer } from 'src/auth/session-serializer';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [UsersModule],
    providers: [MediasoupService, MediasoupGateway, SessionSerializer],
    exports: [MediasoupService]
})
export class MediasoupModule { }
