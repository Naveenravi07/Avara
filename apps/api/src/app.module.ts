import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { MeetModule } from './meet/meet.module';
import { MediasoupModule } from './mediasoup/mediasoup.module';
import { AdmissionModule } from './admission/admission.module';
import { RedisModule } from '@liaoliaots/nestjs-redis';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        UsersModule,
        AuthModule,
        MeetModule,
        MediasoupModule,
        AdmissionModule,
        RedisModule.forRoot({
            config: [
                {
                    namespace: 'publisher',
                    host: 'localhost',
                    port: 6379,
                },
                {
                    namespace: 'subscriber',
                    host: 'localhost',
                    port: 6379,
                }
            ]

        })
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }
