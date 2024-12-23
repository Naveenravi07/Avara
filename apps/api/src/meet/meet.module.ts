import { Module } from '@nestjs/common';
import { MeetService } from './meet.service';
import { MeetController } from './meet.controller';
import { DatabaseModule } from 'src/database/database.module';
import { MediasoupModule } from 'src/mediasoup/mediasoup.module';

@Module({
    imports: [
        DatabaseModule, 
        MediasoupModule,
    ],
    controllers: [MeetController],
    providers: [MeetService],
})
export class MeetModule { }
