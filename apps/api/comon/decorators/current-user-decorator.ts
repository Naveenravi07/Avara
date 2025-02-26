import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '../../src/users/dto/session-user';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest();
    console.log("\n Cookie for Req = ",request.cookies)
    console.log("\n Req.user = ",request.user)
    return request.user ?? null;
  },
);
