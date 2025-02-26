import {
    Body,
    Controller,
    Get,
    Post,
    Redirect,
    UseGuards,
    UsePipes,
    Response,
    Session,
    Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.gurad';
import type { CreateLocalUserRequest } from 'src/users/dto/create-user-request';
import { createLocalUserRequestSchema } from 'src/users/dto/create-user-request';
import { ZodValidationPipe } from 'comon/pipes/zodValidationPipe';
import { GResponse } from 'comon/classes/GResponse';
import { GithubAuthGuard } from './github-auth.gurad';
import { UsersService } from 'src/users/users.service';
import { CurrentUser } from 'comon/decorators/current-user-decorator';
import type { SessionUser } from 'src/users/dto/session-user';
import type { Response as ExpressResponse, Request } from 'express';
import { Session as ExpressSession } from 'express-session';
import { ConfigService } from '@nestjs/config';


@Controller('auth')
export class AuthController {

    public clientUrl: string
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UsersService,
        private readonly configService: ConfigService
    ) {
        this.clientUrl = configService.getOrThrow("CLIENT_URL")
    }

    @UseGuards(LocalAuthGuard)
    @Post('/local/login')
    async local_login(
        @Response() res: ExpressResponse,
        @CurrentUser() user: SessionUser,
        @Session() sess: ExpressSession
    ) {
        sess.save((err) => {
            console.log("[INFO] SESSION SAVED, ERR = ", err)
        })
        res.cookie('x-auth-cookie', user?.id, {
            secure: true,
            httpOnly: false,
            sameSite: 'none',
        });
        res.status(200).send('Success');
    }

    @Post('/local/signup')
    @UsePipes(new ZodValidationPipe(createLocalUserRequestSchema))
    async local_signup(@Body() body: CreateLocalUserRequest) {
        const newUser = await this.authService.signupLocal(body);
        return new GResponse({
            status: 201,
            message: 'New user created successfully',
            data: newUser,
        });
    }

    @Get('/github/login')
    @UseGuards(GithubAuthGuard)
    async github_login() { }

    @Get('/github/cb')
    @UseGuards(GithubAuthGuard)
    @Redirect()
    async github_cb(@Response() res: ExpressResponse, @CurrentUser() user: SessionUser, @Session() sess: ExpressSession) {
        sess.save((err) => {
            console.log("[INFO] SESSION SAVED, ERR = ", err)
        })
        res.cookie('x-auth-cookie', user?.id, {
            secure: true,
            httpOnly: false,
            sameSite: 'none',
        });
        return { url: this.clientUrl }
    }

    @Get('/me')
    async get_user_data(@CurrentUser() user: SessionUser, @Response() res: ExpressResponse, @Session() ses: ExpressSession) {
        console.log("[INFO ]GOT ME REQ, Session Id  = ", ses.id)
        console.log(ses)

        if (user == null) {
            res.clearCookie('x-auth-cookie');
            return res.status(400).json({
                data: undefined,
                message: 'User fetch failed',
                status: 400,
            });
        }
        let data = await this.userService.getUser(user.id);
        return res.status(200).json({
            data: data,
            message: 'User fetched successfully',
            status: 200,
        });
    }

    @Get('/logout')
    async logout_user(@Session() ses: ExpressSession, @Response() res: ExpressResponse) {
        ses.destroy(err => {
            if (err) throw new Error('Logout failed');
        });
        res.clearCookie('x-auth-cookie');
        return res.status(200).json({
            message: 'User lgout successfully',
            status: 200,
        });
    }
}
