import { Module } from '@nestjs/common';
import { AdmissionGateway } from './admission.gateway';
import { AdmissionService } from './admission.service';
import { MeetModule } from 'src/meet/meet.module';

@Module({
    imports:[MeetModule],
    providers: [AdmissionGateway, AdmissionService]
})
export class AdmissionModule { }
