import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from 'comon/filters/execption-filter';
import session from 'express-session';
import passport from 'passport';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { DrizzleExceptionFilter } from 'comon/filters/db-execption-filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    app.useGlobalFilters(new AllExceptionsFilter());
    //app.useGlobalFilters(new DrizzleExceptionFilter())

    app.enableCors({
        origin: [
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'http://0.0.0.0:5000',
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });

    app.use(cookieParser());
    app.use(
        session({
            secret: configService.getOrThrow('SESSION_STORE_SECRET'),
            resave: false,
            saveUninitialized: false,
            name: 'coolSession',
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 24 * 60 * 60 * 1000,
            },
        }),
    );

    app.use(passport.initialize());
    app.use(passport.session());
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
