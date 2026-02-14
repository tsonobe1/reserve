import { describe, expect, it, vi } from 'vitest'
import * as reserveDoModule from '../../../src/reserve/durable-object/reserve-durable-object'

describe('scheduleNextAlarmWhenRetryBudgetExceeded', () => {
  it('予算超過時は15秒後に次alarmを設定する', async () => {
    const scheduleNextAlarmWhenRetryBudgetExceeded = (reserveDoModule as Record<string, unknown>)
      .scheduleNextAlarmWhenRetryBudgetExceeded as
      | ((
          storage: {
            put: (key: string, value: unknown) => Promise<void>
            setAlarm: (time: number) => Promise<void>
          },
          alarmStartedAt: number,
          attempt: number,
          now: number
        ) => Promise<boolean>)
      | undefined

    const put = vi.fn(async () => {})
    const setAlarm = vi.fn(async () => {})
    const now = 1_700_000_000_000
    const alarmStartedAt = now - 12 * 60 * 1000

    expect(scheduleNextAlarmWhenRetryBudgetExceeded).toBeTypeOf('function')
    const scheduled = await scheduleNextAlarmWhenRetryBudgetExceeded?.(
      { put, setAlarm },
      alarmStartedAt,
      8,
      now
    )

    expect(scheduled).toBe(true)
    expect(put).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('retry_state', {
      attempt: 0,
      alarmStartedAt: now,
    })
    expect(setAlarm).toHaveBeenCalledTimes(1)
    expect(setAlarm).toHaveBeenCalledWith(now + 15_000)
  })
})
