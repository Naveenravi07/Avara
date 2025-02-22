import { z } from 'zod';
import {DtlsParameters} from "mediasoup/node/lib/types"

export const transportConnectReqSchema = z
    .object({
        consumer: z.boolean(),
        transportId: z.string(),
        dtlsParameters: z.custom<DtlsParameters>()
    })

export type TransportConnectReq = z.infer<typeof transportConnectReqSchema>;

