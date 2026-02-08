import { z } from 'zod'

export const ReservePayloadSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  executeAt: z.string(),
})

export type ReservePayload = z.infer<typeof ReservePayloadSchema>
