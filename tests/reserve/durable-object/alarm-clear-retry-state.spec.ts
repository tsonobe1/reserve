import { describe, expect, it, vi } from 'vitest'
import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'

vi.mock('../../../src/reserve/service/labola-yoyogi/reservation', () => {
  return {
    executeLabolaYoyogiReservation: vi.fn(async () => {}),
  }
})

describe('ReserveDurableObject.alarm clear retry_state', () => {
  it('予約処理が成功したら retry_state を削除する', async () => {
    const stub = env.RESERVE_DO.get(env.RESERVE_DO.newUniqueId())
    const now = Date.now()

    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put('params', {
        facilityId: 1,
        courtNo: 1,
        date: '2026-02-13',
        startTime: '15:00',
        endTime: '16:00',
      })
      await state.storage.put('retry_state', {
        attempt: 3,
        alarmStartedAt: now - 60_000,
      })
      await state.storage.setAlarm(now)
    })

    await runDurableObjectAlarm(stub)

    const retryState = await runInDurableObject(stub, async (_instance, state) => {
      return state.storage.get('retry_state')
    })
    expect(retryState).toBeUndefined()
  })
})
