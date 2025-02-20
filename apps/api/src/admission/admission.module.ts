import { Module } from '@nestjs/common';
import { AdmissionGateway } from './admission.gateway';
import { AdmissionService } from './admission.service';
import { MeetModule } from 'src/meet/meet.module';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [MeetModule, UsersModule,AuthModule],
    providers: [AdmissionGateway, AdmissionService]
})
export class AdmissionModule { }
