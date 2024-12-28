import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { DrizzleError } from "drizzle-orm";

@Catch()
export class DrizzleExceptionFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        let ctx = host.switchToHttp()
        let res = ctx.getResponse()

        if (exception instanceof DrizzleError) {
            console.log("drizzle error")
            console.log(exception.message)
        }else{
            console.log("not drizzle err")
            console.log(exception)
        }
    }
}
