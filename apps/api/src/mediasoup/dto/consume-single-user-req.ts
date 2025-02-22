import { RtpCapabilities } from 'mediasoup/node/lib/rtpParametersTypes';
import { z } from 'zod';

export const consumeSingleUserReqSchema = z
    .object({
        producerId: z.string(),
        rtpCapabilities: z.custom<RtpCapabilities>(),
    })

export type ConsumeSingleUserReq = z.infer<typeof consumeSingleUserReqSchema >;

