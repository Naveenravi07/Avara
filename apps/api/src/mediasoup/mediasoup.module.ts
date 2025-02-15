import { Module } from '@nestjs/common';
import { MediasoupGateway } from './mediasoup.gateway';
import { MediasoupService } from './mediasoup.service';
import { UsersModule } from 'src/users/users.module';
import { MeetModule } from 'src/meet/meet.module';

@Module({
    imports: [UsersModule,MeetModule],
    providers: [MediasoupService, MediasoupGateway ],
})
export class MediasoupModule { }
