import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { Request } from "express"
import { Observable } from "rxjs"

@Injectable()
export class AuthenticatedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean | Promise<boolean> |
        Observable<boolean> {
        const req = context.switchToHttp().getRequest<Request>()
        console.log(req.isAuthenticated())
        return req.isAuthenticated()
    }
}

