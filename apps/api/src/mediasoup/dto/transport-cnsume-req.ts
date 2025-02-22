import { RtpCapabilities } from 'mediasoup/node/lib/rtpParametersTypes';
import { z } from 'zod';

export const transportConsumeReqSchema = z
    .object({
        rtpCapabilities: z.custom<RtpCapabilities>(),
    })

export type TransportConsumeReq = z.infer<typeof transportConsumeReqSchema>;

