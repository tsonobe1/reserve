import { describe, expect, it, vi } from 'vitest'
import * as reserveDoModule from '../../../src/reserve/durable-object/reserve-durable-object'

describe('updateRetryStateOnRetryableError', () => {
  it('非再試行エラー(認証失敗/4xx)では retry_state を更新しない', async () => {
    const updateRetryStateOnRetryableError = (reserveDoModule as Record<string, unknown>)
      .updateRetryStateOnRetryableError as
      | ((
          storage: {
            put: (key: string, value: unknown) => Promise<void>
            setAlarm: (time: number) => Promise<void>
          },
          current: { attempt: number; alarmStartedAt: number } | undefined,
          error: Error,
          now: number
        ) => Promise<boolean>)
      | undefined

    const put = vi.fn(async () => {})
    const setAlarm = vi.fn(async () => {})
    const now = 1_700_000_000_000

    expect(updateRetryStateOnRetryableError).toBeTypeOf('function')

    await expect(
      updateRetryStateOnRetryableError?.(
        { put, setAlarm },
        { attempt: 3, alarmStartedAt: now - 60_000 },
        new Error('ログインPOSTに失敗しました: 400'),
        now
      )
    ).resolves.toBe(false)

    expect(put).not.toHaveBeenCalled()
    expect(setAlarm).not.toHaveBeenCalled()
  })
})
