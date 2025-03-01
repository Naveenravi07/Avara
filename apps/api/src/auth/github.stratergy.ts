import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class GithubStratergy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {
    super({
      clientID: configService.getOrThrow('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow('GITHUB_CLIENT_SECRET'),
      callBackUrl: 'http://localhost:3000/auth/github/cb',
      scope: ['user:email'],
    });
  }
  async validate(_accessToken: string, _refreshToken: string, profile: Profile, cb: any) {
    try {
      const user = await this.authService.validateGithubUser(profile);
      return cb(null, user);
    } catch (e) {
      return cb(e, null);
    }
  }
}
