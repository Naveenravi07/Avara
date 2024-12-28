import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();

        const status =
            exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

        let errorResponse: any;
        if (exception instanceof HttpException) {
            errorResponse = exception.getResponse();
            if (typeof errorResponse === 'string') {
                errorResponse = { message: errorResponse };
            }
        } else if (exception instanceof Error) {
            errorResponse = {
                message: exception.message,
                error: exception.name,
            };
        } else {
            errorResponse = {
                message: 'Internal server error',
                error: 'Unknown Error',
            };
        }

        response.status(status).json({
            statusCode: status,
            ...errorResponse,
        });
    }
}
