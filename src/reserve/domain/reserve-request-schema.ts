import { z } from 'zod'

export const ReserveIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type ReserveIdParam = z.infer<typeof ReserveIdParamSchema>

export const ReserveCreatePayloadSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  executeAt: z.string(),
})

export type ReserveCreatePayload = z.infer<typeof ReserveCreatePayloadSchema>
