import { RtpCapabilities } from 'mediasoup/node/lib/rtpParametersTypes';
import { z } from 'zod';

export const closeProducerReqSchema = z
    .object({
        producerId: z.string(),
    })

export type CloseProducerReq = z.infer<typeof closeProducerReqSchema >;

