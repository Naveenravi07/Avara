import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MeetService } from './meet.service';
import type { CreateMeet } from './dto/create-meet.dto';
import { UpdateMeetDto } from './dto/update-meet.dto';
import { GResponse } from 'comon/classes/GResponse';

@Controller('meet')
export class MeetController {
    constructor(private readonly meetService: MeetService) { }

    @Post()
    async create(@Body() data: CreateMeet) {
        console.log(data)
        let doc = await this.meetService.create(data);
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
