import { z } from 'zod'

export const ReserveIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id は 1 以上の整数である必要があります'),
})

export type ReserveIdParam = z.infer<typeof ReserveIdParamSchema>

export const ReserveDoIdParamSchema = z.object({
  doId: z.string().regex(/^[0-9a-f]{64}$/i, 'doId は 64 文字の16進数である必要があります'),
})

export type ReserveDoIdParam = z.infer<typeof ReserveDoIdParamSchema>

export const ReserveCreatePayloadSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  executeAt: z.string().refine((value) => {
    const time = Date.parse(value)
    return !Number.isNaN(time) && time > Date.now()
  }, 'executeAt は有効な未来日時である必要があります'),
})

export type ReserveCreatePayload = z.infer<typeof ReserveCreatePayloadSchema>
