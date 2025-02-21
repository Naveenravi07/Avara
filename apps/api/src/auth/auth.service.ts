import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import bcrypt from 'bcrypt';
import type {
    CreateGithubUserRequest,
    CreateLocalUserRequest,
} from 'src/users/dto/create-user-request';
import { Profile } from 'passport-github2';

@Injectable()
export class AuthService {
    constructor(private readonly userService: UsersService) { }

    async validateLocalUser(email: string, pwd: string) {
        const user = await this.userService.getUserByEmail(email);
        if (user.pwd == null) {
            throw new UnauthorizedException('Invalid email or Password');
        }
        const isValid = await bcrypt.compare(pwd, user.pwd);
        if (!isValid) {
            throw new UnauthorizedException('Invalid Password');
        }
        return { name: user.name, id: user.id, pfpUrl: user.pfpUrl };
    }

    async signupLocal(user: CreateLocalUserRequest) {
        user.provider = 'email';
        user.pfpUrl = user.pfpUrl ?? null;
        user.pwd = await bcrypt.hash(user.pwd, 10);
        const doc = await this.userService.createUser(user);
        return { name: doc.name, id: doc.id, pfpUrl: doc.pfpUrl };
    }

    async validateGithubUser(profile: Profile) {
        const email: string | null = profile.emails?.[0]?.value || null;
        if (!email) {
            throw new UnauthorizedException('GitHub account does not provide an email');
        }
        try {
            const userExist = await this.userService.getUserByEmail(email);
            return { name: userExist.name, id: userExist.id, pfpUrl: userExist.pfpUrl };
        } catch (e) {
            if (e instanceof NotFoundException) {
                const name: string = profile.displayName || email.split('@')?.[0] || 'Github user';
                const pfpUrl: string | null = profile?.photos?.[0]?.value || null;
                const githubId: string = profile?.id;
                if (!githubId) {
                    throw new UnauthorizedException('GitHub account does not provide an id');
                }
                const user: CreateGithubUserRequest = {
                    name,
                    pfpUrl,
                    githubId,
                    email,
                    provider: 'github',
                };
                const data = await this.userService.createUser(user);
                return { name: data.name, id: data.id, pfpUrl: data.pfpUrl };
            }
            throw e;
        }
    }
}
