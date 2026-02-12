import { DurableObject } from 'cloudflare:workers'
import { ReserveParamsSchema } from '../domain/reserve-request-schema'
import { reserveLabolaYoyogi } from '../service/reserve-labola-yoyogi'

const LABOLA_RETRY_BUDGET_MS = 12 * 60 * 1000
const LABOLA_RETRY_MAX_ATTEMPT = 8
const LABOLA_RETRY_NEXT_ALARM_DELAY_MS = 15 * 1000

export const scheduleNextAlarmWhenRetryBudgetExceeded = async (
  storage: { setAlarm: (time: number) => Promise<void> },
  alarmStartedAt: number,
  attempt: number,
  now: number
): Promise<boolean> => {
  const elapsed = now - alarmStartedAt
  const shouldScheduleNextAlarm =
    elapsed >= LABOLA_RETRY_BUDGET_MS || attempt >= LABOLA_RETRY_MAX_ATTEMPT

  if (!shouldScheduleNextAlarm) {
    return false
  }

  await storage.setAlarm(now + LABOLA_RETRY_NEXT_ALARM_DELAY_MS)
  return true
}

// Storage キー:
// - params: POST ペイロードの params
// Alarm:
// - alarmAt: Durable Object のアラームスケジューラで管理される時刻 (setAlarm/getAlarm)

export class ReserveDurableObject extends DurableObject {
  async schedule(params: unknown, executeAt: string): Promise<void> {
    const scheduledAt = Date.parse(executeAt)
    if (Number.isNaN(scheduledAt)) {
      throw new Error('executeAt は有効な日時文字列である必要があります')
    }

    await this.ctx.storage.put('params', params ?? null)
    await this.ctx.storage.setAlarm(scheduledAt)
  }

  async getState(): Promise<{ params: unknown; alarmAt: number | null }> {
    const params = await this.ctx.storage.get('params')
    const alarmAt = await this.ctx.storage.getAlarm()
    return { params: params ?? null, alarmAt }
  }

  async rollback(): Promise<void> {
    await this.ctx.storage.deleteAlarm()
    await this.ctx.storage.deleteAll()
  }

  async alarm(): Promise<void> {
    const params = await this.ctx.storage.get('params')
    const parsed = ReserveParamsSchema.safeParse(params)
    if (!parsed.success) {
      console.warn('Skip reserve: params が不正です', { id: this.ctx.id.toString(), params })
      return
    }
    const reserveParams = parsed.data

    if (reserveParams.facilityId !== 1) {
      console.info('Skip reserve: 非対応施設', {
        id: this.ctx.id.toString(),
        facilityId: reserveParams.facilityId,
      })
      return
    }

    console.log('予約実行対象を受け付けました（Labola/代々木）', {
      id: this.ctx.id.toString(),
      params: reserveParams,
    })
    await reserveLabolaYoyogi(this.env, this.ctx.id.toString(), reserveParams)
  }
}
