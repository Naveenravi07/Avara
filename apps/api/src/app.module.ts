import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MediasoupService } from './mediasoup/mediasoup.service';
import { MediasoupModule } from './mediasoup/mediasoup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    MediasoupModule,
  ],
  controllers: [],
  providers: [MediasoupService],
})
export class AppModule {}
