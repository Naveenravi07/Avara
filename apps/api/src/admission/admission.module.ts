import { Module } from '@nestjs/common';
import { AdmissionGateway } from './admission.gateway';
import { AdmissionService } from './admission.service';
import { MeetModule } from 'src/meet/meet.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
    imports: [MeetModule, AuthModule],
    providers: [AdmissionGateway, AdmissionService],
    exports:[AdmissionService]
})
export class AdmissionModule { }
