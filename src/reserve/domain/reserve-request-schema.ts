import { z } from 'zod'

export const ReserveIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id は 1 以上の整数である必要があります'),
})

export type ReserveIdParam = z.infer<typeof ReserveIdParamSchema>

export const ReserveDoIdParamSchema = z.object({
  doId: z.string().regex(/^[0-9a-f]{64}$/i, 'doId は 64 文字の16進数である必要があります'),
})

export type ReserveDoIdParam = z.infer<typeof ReserveDoIdParamSchema>

export const ReserveParamsSchema = z.object({
  facilityId: z.coerce.number().int().positive('facilityId は 1 以上の整数である必要があります'),
  courtNo: z.coerce.number().int().positive('courtNo は 1 以上の整数である必要があります'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date は YYYY-MM-DD 形式である必要があります'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'startTime は HH:mm 形式である必要があります'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'endTime は HH:mm 形式である必要があります'),
})

export type ReserveParams = z.infer<typeof ReserveParamsSchema>

export const ReserveCreatePayloadSchema = z.object({
  params: z.record(z.string(), z.unknown()),
  executeAt: z.string().refine((value) => {
    const time = Date.parse(value)
    return !Number.isNaN(time) && time > Date.now()
  }, 'executeAt は有効な未来日時である必要があります'),
})

export type ReserveCreatePayload = z.infer<typeof ReserveCreatePayloadSchema>
