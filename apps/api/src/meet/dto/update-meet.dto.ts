import { z } from 'zod';

export const updateMeetReqSchema = z
    .object({
        inviteOnly: z.boolean(),
    })

export type UpdateMeetReq = z.infer<typeof updateMeetReqSchema>;

