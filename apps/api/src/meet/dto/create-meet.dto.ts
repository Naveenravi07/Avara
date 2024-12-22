import { z } from 'zod';

export const createMeetSchema = z
    .object({
        creator: z.string(),
    })

export type CreateMeet = z.infer<typeof createMeetSchema>;

