import { z } from 'zod';

export const admitUsertoMeet = z
    .object({
        roomId: z.string(),
        userId: z.string(),
    })

export type AdmitUserToMeet = z.infer<typeof admitUsertoMeet>;

