import { z } from 'zod';

export const resumeConsumeTransportReqSchema = z
    .object({
        consumerId: z.string(),
    })

export type ResumeConsumeTransportReq = z.infer<typeof resumeConsumeTransportReqSchema >;

