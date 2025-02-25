import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from 'comon/filters/execption-filter';
import session from 'express-session';
import passport from 'passport';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { RedisStore } from 'connect-redis';


async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const redisService = app.get(RedisService); // Inject RedisService


    app.useGlobalFilters(new AllExceptionsFilter());
    //app.useGlobalFilters(new DrizzleExceptionFilter())

    app.enableCors({
        origin: [
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'http://0.0.0.0:5000',
            'http://192.168.0.110:5000',
            "https://avara-web.vercel.app"
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    });


    const redisClient = redisService.getOrThrow('publisher');
    const redisStore = new RedisStore({
        client: redisClient,
        prefix: "avara-login:"
    })


    app.use(cookieParser());
    app.use(
        session({
            store: redisStore,
            secret: configService.getOrThrow('SESSION_STORE_SECRET'),
            resave: false,
            saveUninitialized: false,
            name: 'coolSession',
            cookie: {
                secure: true,
                //httpOnly: true,
                httpOnly: false,
                sameSite: 'none',
                maxAge: 24 * 60 * 60 * 1000,
            },
        }),
    );

    app.use(passport.initialize());
    app.use(passport.session());
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
