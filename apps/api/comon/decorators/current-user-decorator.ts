import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SessionUser } from '../../src/users/dto/session-user';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): SessionUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user ?? null;
  },
);
