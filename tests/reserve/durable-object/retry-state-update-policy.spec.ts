import { describe, expect, it, vi } from 'vitest'
import * as reserveDoModule from '../../../src/reserve/durable-object/reserve-durable-object'

describe('updateRetryStateOnRetryableError', () => {
  it('customer-form 5xx では retry_state を更新する', async () => {
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
        { attempt: 2, alarmStartedAt: now - 30_000 },
        new Error('customer-info 送信に失敗しました: 500'),
        now
      )
    ).resolves.toBe(true)

    expect(put).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('retry_state', {
      attempt: 3,
      alarmStartedAt: now - 30_000,
    })
    expect(setAlarm).toHaveBeenCalledTimes(1)
    expect(setAlarm).toHaveBeenCalledWith(now + 15_000)
  })

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

describe('shouldMarkAsFailed', () => {
  it('予約不可エラーなら true を返す', () => {
    const shouldMarkAsFailed = (reserveDoModule as Record<string, unknown>).shouldMarkAsFailed as
      | ((error: Error) => boolean)
      | undefined

    expect(shouldMarkAsFailed).toBeTypeOf('function')
    expect(shouldMarkAsFailed?.(new Error('希望時間帯は予約不可（すでに予約済み）'))).toBe(true)
  })

  it('通信エラーは false を返す', () => {
    const shouldMarkAsFailed = (reserveDoModule as Record<string, unknown>).shouldMarkAsFailed as
      | ((error: Error) => boolean)
      | undefined

    expect(shouldMarkAsFailed).toBeTypeOf('function')
    expect(shouldMarkAsFailed?.(new Error('ログインPOST中に通信エラーが発生しました'))).toBe(false)
  })
})
