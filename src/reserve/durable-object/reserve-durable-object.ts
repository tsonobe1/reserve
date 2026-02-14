import { DurableObject } from 'cloudflare:workers'
import { ReserveParamsSchema } from '../domain/reserve-request-schema'
import { executeLabolaYoyogiReservation } from '../service/labola-yoyogi/reservation'
import { updateStatusByDoId } from '../repository/reserve'

const LABOLA_RETRY_BUDGET_MS = 12 * 60 * 1000
const LABOLA_RETRY_MAX_ATTEMPT = 8
const LABOLA_RETRY_NEXT_ALARM_DELAY_MS = 15 * 1000

type RetryState = {
  attempt: number
  alarmStartedAt: number
}

export const shouldIncrementRetryState = (error: Error): boolean => {
  return (
    error.message.includes('相手側サーバ障害') || error.message.includes('通信エラーが発生しました')
  )
}

export const shouldMarkAsFailed = (error: Error): boolean => {
  return error.message.includes('希望時間帯は予約不可')
}

const updateReserveStatusSafely = async (
  db: D1Database,
  doId: string,
  status: 'done' | 'fail'
): Promise<void> => {
  try {
    await updateStatusByDoId(db, doId, status)
  } catch (error) {
    console.warn('予約ステータス更新に失敗しました（処理は継続）', {
      id: doId,
      status,
      error,
    })
  }
}

const buildNextRetryState = (current: RetryState | undefined, now: number): RetryState => {
  if (!current) {
    return { attempt: 1, alarmStartedAt: now }
  }
  return {
    attempt: current.attempt + 1,
    alarmStartedAt: current.alarmStartedAt,
  }
}

export const updateRetryStateOnRetryableError = async (
  storage: {
    put: (key: string, value: unknown) => Promise<void>
    setAlarm: (time: number) => Promise<void>
  },
  currentRetryState: RetryState | undefined,
  error: Error,
  now: number
): Promise<boolean> => {
  if (!shouldIncrementRetryState(error)) {
    return false
  }

  const nextRetryState = buildNextRetryState(currentRetryState, now)
  await storage.put('retry_state', nextRetryState)
  await storage.setAlarm(now + LABOLA_RETRY_NEXT_ALARM_DELAY_MS)
  return true
}

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
    const retryState = await this.ctx.storage.get<RetryState>('retry_state')
    if (retryState) {
      const scheduledNext = await scheduleNextAlarmWhenRetryBudgetExceeded(
        this.ctx.storage,
        retryState.alarmStartedAt,
        retryState.attempt,
        Date.now()
      )
      if (scheduledNext) {
        console.info('再試行予算に到達したため、次のalarmへ引き継ぎます', {
          id: this.ctx.id.toString(),
          attempt: retryState.attempt,
        })
        return
      }
    }

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
    try {
      await executeLabolaYoyogiReservation(this.env, this.ctx.id.toString(), reserveParams)
      await updateReserveStatusSafely(this.env.reserve, this.ctx.id.toString(), 'done')
      if (retryState) {
        await this.ctx.storage.delete('retry_state')
      }
    } catch (error) {
      if (error instanceof Error) {
        if (shouldMarkAsFailed(error)) {
          await updateReserveStatusSafely(this.env.reserve, this.ctx.id.toString(), 'fail')
          console.info('予約不可のため fail で終了します', {
            id: this.ctx.id.toString(),
            error: error.message,
          })
          return
        }
        const handled = await updateRetryStateOnRetryableError(
          this.ctx.storage,
          retryState,
          error,
          Date.now()
        )
        if (!handled) {
          throw error
        }
        const nextRetryState = buildNextRetryState(retryState, Date.now())
        console.warn('予約処理で再試行対象エラーが発生したため、次のalarmを設定します', {
          id: this.ctx.id.toString(),
          attempt: nextRetryState.attempt,
          error: error.message,
        })
        return
      }
      throw error
    }
  }
}
