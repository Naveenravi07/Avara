import { Test, TestingModule } from '@nestjs/testing';
import { MeetService } from './meet.service';
import { DATABASE_CONNECTION } from '../../src/database/database-connection';
import { MediasoupService } from '../../src/mediasoup/mediasoup.service';


const mockDb = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn(),
    where: jest.fn().mockReturnValue([]),
    insert: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: 1, email: 'test@example.com', name: 'Test User' }]),
};

const mediaSoupService = {

}

describe('MeetService', () => {
    let service: MeetService;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MeetService,
                {
                    provide: DATABASE_CONNECTION,
                    useValue: mockDb,
                },
                {
                    provide: MediasoupService,
                    useValue: mediaSoupService
                }

            ],
        }).compile();

        service = module.get<MeetService>(MeetService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
