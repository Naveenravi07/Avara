import { MediaKind, RtpParameters } from 'mediasoup/node/lib/rtpParametersTypes';
import { AppData } from 'mediasoup/node/lib/types';
import { z } from 'zod';

export const transportProduceReqSchema = z
    .object({
        transportId: z.string(),
        kind: z.custom<MediaKind>(),
        rtpParameters: z.custom<RtpParameters>(),
        appData: z.custom<AppData>()
    })

export type TransportProduceReq = z.infer<typeof transportProduceReqSchema>;

