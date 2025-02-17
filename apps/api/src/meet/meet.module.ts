import { Module } from '@nestjs/common';
import { MeetService } from './meet.service';
import { MeetController } from './meet.controller';
import { DatabaseModule } from 'src/database/database.module';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [
        DatabaseModule,
        UsersModule
    ],
    controllers: [MeetController],
    providers: [MeetService],
    exports:[MeetService]
})
export class MeetModule { }
