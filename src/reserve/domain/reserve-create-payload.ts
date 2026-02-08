import { z } from 'zod'

export const ReserveCreatePayloadSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  executeAt: z.string(),
})

export type ReserveCreatePayload = z.infer<typeof ReserveCreatePayloadSchema>
