import { Module } from '@nestjs/common';
import { MediasoupGateway } from './mediasoup.gateway';
import { UsersModule } from 'src/users/users.module';
import { MediasoupService } from './mediasoup.service';
import { MeetModule } from 'src/meet/meet.module';

@Module({
    imports: [UsersModule,MeetModule],
    providers: [MediasoupGateway,MediasoupService ],
    exports:[MediasoupService]
})
export class MediasoupModule { }
