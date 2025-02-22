import { z } from 'zod';

export const initializeMeetingReqSchema = z
    .object({
        id: z.string(),
    })

export type InitializeMeet = z.infer<typeof initializeMeetingReqSchema>;
