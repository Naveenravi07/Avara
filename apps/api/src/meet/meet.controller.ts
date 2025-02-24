import { Controller, Post, Body, UseGuards, UsePipes, Query, Get, Patch, Param } from '@nestjs/common';
import { MeetService } from './meet.service';
import { GResponse } from '../../comon/classes/GResponse';
import { CurrentUser } from '../../comon/decorators/current-user-decorator';
import { type SessionUser } from '../../src/users/dto/session-user';
import { AuthenticatedGuard } from '../../src/auth/session.auth.guard';
import { type CreateMeet } from './dto/create-meet.dto';
import { type AdmitUserToMeet } from './dto/admit-user-in-meet.dto';
import { ZodValidationPipe } from 'comon/pipes/zodValidationPipe';
import { type UpdateMeetReq, updateMeetReqSchema } from './dto/update-meet.dto';

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

    @Get('/waiters')
    @UseGuards(AuthenticatedGuard)
    async getWaitingClients(@Query('roomId') roomId: string) {
        let resp = this.meetService.getAdmitRequests(roomId)
        return resp
    }


    @Post('/admit')
    @UseGuards(AuthenticatedGuard)
    async admitUsertoRoom(@Body() data: AdmitUserToMeet) {
        let doc = await this.meetService.admitUserToMeet(data.roomId, data.userId)
        return doc
    }


    @Post('/reject')
    @UseGuards(AuthenticatedGuard)
    async rejectUserToRoom(@Body() data: AdmitUserToMeet) {
        let doc = await this.meetService.rejectUserToMeet(data.roomId, data.userId)
        return doc
    }

    @Patch('/')
    @UseGuards(AuthenticatedGuard)
    async updateMeetDetails(@Query('roomId') id: string, @Body(new ZodValidationPipe(updateMeetReqSchema)) data: UpdateMeetReq) {
        let doc = await this.meetService.updateMeet(id,data);
        return doc
    }

    @Get('/:id')
    @UseGuards(AuthenticatedGuard)
    async getMeetDetails(@Param('id') id: string) {
        const doc = await this.meetService.getDetailsFromId(id);
        return doc
    }
}
