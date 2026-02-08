import { z } from 'zod'

export const ReservePayloadSchema = z.object({
  params: z.unknown(),
  execute_at: z.string().optional(),
  status: z.string().optional(),
  alarm_namespace: z.string().optional(),
  alarm_object_id: z.string().optional(),
  alarm_scheduled_at: z.string().optional(),
})

export type ReservePayload = z.infer<typeof ReservePayloadSchema>
