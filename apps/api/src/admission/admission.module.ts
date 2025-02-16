import { Module } from '@nestjs/common';
import { AdmissionGateway } from './admission.gateway';
import { AdmissionService } from './admission.service';
import { MeetModule } from 'src/meet/meet.module';
import { UsersModule } from 'src/users/users.module';

@Module({
    imports: [MeetModule, UsersModule],
    providers: [AdmissionGateway, AdmissionService]
})
export class AdmissionModule { }
