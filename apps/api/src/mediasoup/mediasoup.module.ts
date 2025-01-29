import { Module } from '@nestjs/common';
import { MediasoupGateway } from './mediasoup.gateway';
import { MediasoupService } from './mediasoup.service';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [UsersModule],
    providers: [MediasoupService, MediasoupGateway ],
    exports: [MediasoupService]
})
export class MediasoupModule { }
