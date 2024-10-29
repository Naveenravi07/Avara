import { Module } from '@nestjs/common';
import { ConfigService } from "@nestjs/config"
import { Pool } from 'pg';
import { drizzle } from "drizzle-orm/node-postgres"
import { DATABASE_CONNECTION } from './database-connection';

@Module({
    providers: [
        {
            provide: DATABASE_CONNECTION,
            useFactory: (configService: ConfigService) => {
                const pool = new Pool({
                    connectionString: configService.getOrThrow("DATABASE_URL")
                });
                return drizzle(pool, {

                })
            },
            inject: [ConfigService]
        }
    ]
})

export class DatabaseModule { }
