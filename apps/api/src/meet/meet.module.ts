import { Module } from '@nestjs/common';
import { MeetService } from './meet.service';
import { MeetController } from './meet.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
    imports: [
        DatabaseModule, 
    ],
    controllers: [MeetController],
    providers: [MeetService],
    exports:[MeetService]
})
export class MeetModule { }
