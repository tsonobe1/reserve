import { beforeEach, describe, expect, it, vi } from 'vitest'
import { env, runInDurableObject } from 'cloudflare:test'

vi.mock('../../../src/reserve/service/labola-yoyogi/reservation', () => {
  return {
    executeLabolaYoyogiReservation: vi.fn(async () => {
      throw new Error('ログインPOSTに失敗しました: 400')
    }),
  }
})

describe('ReserveDurableObject.alarm non-retryable failure', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('非再試行エラー時は throw せず retry_state を更新しない', async () => {
    const stub = env.RESERVE_DO.get(env.RESERVE_DO.newUniqueId())

    const { retryState, alarmAt } = await runInDurableObject(stub, async (instance, state) => {
      await state.storage.put('params', {
        facilityId: 1,
        courtNo: 1,
        date: '2026-02-13',
        startTime: '15:00',
        endTime: '16:00',
      })
      await expect((instance as { alarm: () => Promise<void> }).alarm()).resolves.toBeUndefined()
      const retryState = await state.storage.get('retry_state')
      const alarmAt = await state.storage.getAlarm()
      return { retryState, alarmAt }
    })
    expect(retryState).toBeUndefined()
    expect(alarmAt).toBeNull()
  })
})
