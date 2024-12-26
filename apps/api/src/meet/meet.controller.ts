import { Controller, Post, Body, UseGuards, UsePipes } from '@nestjs/common';
import { MeetService } from './meet.service';
import { createMeetSchema, type CreateMeet } from './dto/create-meet.dto';
import { GResponse } from 'comon/classes/GResponse';
import { CurrentUser } from 'comon/decorators/current-user-decorator';
import { type SessionUser } from 'src/users/dto/session-user';
import { AuthenticatedGuard } from 'src/auth/session.auth.guard';
import { ZodValidationPipe } from 'comon/pipes/zodValidationPipe';

@Controller('meet')
export class MeetController {
    constructor(
        private readonly meetService: MeetService,
    ) { }

    @Post()
    @UseGuards(AuthenticatedGuard)
    async create(@Body() data: CreateMeet, @CurrentUser() user: SessionUser) {
        let doc = await this.meetService.create(data, user);
        return new GResponse({
            data: doc,
            message: "meet created successfully",
            status: 200
        })
    }

}
