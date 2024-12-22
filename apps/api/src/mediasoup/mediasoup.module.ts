import { Module } from '@nestjs/common';
import { MediasoupGateway } from './mediasoup.gateway';
import { MediasoupService } from './mediasoup.service';
import { SessionSerializer } from 'src/auth/session-serializer';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [PassportModule.register({ session: true })],
  providers: [MediasoupService, MediasoupGateway, SessionSerializer],
})
export class MediasoupModule {}
