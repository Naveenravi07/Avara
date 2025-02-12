import { Test, TestingModule } from '@nestjs/testing';
import { MeetService } from './meet.service';
import { UnauthorizedException } from '@nestjs/common';
import { MediasoupService } from '../../src/mediasoup/mediasoup.service';
import { DATABASE_CONNECTION } from '../../src/database/database-connection';
import * as schema from "./schema";
import { SessionUser } from '../../src/users/dto/session-user';

describe('MeetService', () => {
    let service: MeetService;

    const mockDatabase = {
        insert: jest.fn().mockReturnThis(),
    };

    let mockMediasoupService: { addNewRoom: jest.Mock };

    beforeEach(async () => {

        mockMediasoupService = {
            addNewRoom: jest.fn().mockResolvedValue(undefined)
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeetService,
                { provide: DATABASE_CONNECTION, useValue: mockDatabase },
                { provide: MediasoupService, useValue: mockMediasoupService }
            ],
        }).compile();

        service = module.get<MeetService>(MeetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });


    it('should throw UnauthorizedException if user is not provided', async () => {
        await expect(service.create({} as any, null as any)).rejects.toThrow(UnauthorizedException);
    });



    it('should not create a meeting if some error on insert occurs', async () => {
        const data = { creator: '1212' } as any;
        const user = { id: 'user1' } as SessionUser;

        mockDatabase.insert.mockReturnValueOnce({
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValueOnce([]),
        });
        await expect(service.create(data, user)).rejects.toThrow(new Error("Room creation failed"))
        expect(mockDatabase.insert).toHaveBeenCalledWith(schema.meetTable);
    });


});

