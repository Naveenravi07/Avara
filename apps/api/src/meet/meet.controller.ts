import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MeetService } from './meet.service';
import type { CreateMeet } from './dto/create-meet.dto';
import { UpdateMeetDto } from './dto/update-meet.dto';
import { GResponse } from 'comon/classes/GResponse';
import { CurrentUser } from 'comon/decorators/current-user-decorator';
import type { SessionUser } from 'src/users/dto/session-user';
import { throws } from 'assert';

@Controller('meet')
export class MeetController {
    constructor(
        private readonly meetService: MeetService,
    ) { }

    @Post()
    async create(@Body() data: CreateMeet, @CurrentUser() user: SessionUser) {
        // Should add a guard for this route and remove this boilerplate
        let doc = await this.meetService.create(data,user);
        return new GResponse({
            data: doc,
            message: "meet created successfully",
            status: 200
        })
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.meetService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateMeetDto: UpdateMeetDto) {
        return this.meetService.update(+id, updateMeetDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.meetService.remove(+id);
    }
}
