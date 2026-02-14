import { beforeEach, describe, expect, it, vi } from 'vitest'
import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'

vi.mock('../../../src/reserve/service/labola-yoyogi/reservation', () => {
  return {
    executeLabolaYoyogiReservation: vi.fn(async () => {
      throw new Error('ログインPOST中に通信エラーが発生しました')
    }),
  }
})

describe('ReserveDurableObject.alarm retry state update', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('reserve処理が通信エラーで失敗したら retry_state を保存する', async () => {
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
      await state.storage.setAlarm(now)
    })

    await runDurableObjectAlarm(stub)

    const retryState = await runInDurableObject(stub, async (_instance, state) => {
      return state.storage.get<{ attempt: number; alarmStartedAt: number }>('retry_state')
    })

    expect(retryState).toStrictEqual({
      attempt: 1,
      alarmStartedAt: expect.any(Number),
    })
    expect((retryState as { alarmStartedAt: number }).alarmStartedAt).toBeGreaterThanOrEqual(now)

    const nextAlarmAt = await runInDurableObject(stub, async (_instance, state) => {
      return state.storage.getAlarm()
    })
    expect(nextAlarmAt).not.toBeNull()
    expect(nextAlarmAt).toBeGreaterThanOrEqual(now + 15_000)
  })
})
