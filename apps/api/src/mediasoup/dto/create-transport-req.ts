import { z } from 'zod';

export const createTransportReqSchema = z
    .object({
        consumer: z.boolean(),
    })

export type CreateTrasnsportReq = z.infer<typeof createTransportReqSchema >;

