import { beforeEach, describe, expect, it, vi } from 'vitest'
import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test'

describe('ReserveDurableObject.alarm retry connection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('再試行対象エラーかつ予算超過時は次alarmを15秒後に設定して終了する', async () => {
    const stub = env.RESERVE_DO.get(env.RESERVE_DO.newUniqueId())
    const now = Date.now()

    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put('params', {
        facilityId: 2,
        courtNo: 1,
        date: '2026-02-13',
        startTime: '15:00',
        endTime: '16:00',
      })
      await state.storage.put('retry_state', {
        attempt: 8,
        alarmStartedAt: now - 12 * 60 * 1000,
      })
      await state.storage.setAlarm(now)
    })

    await runDurableObjectAlarm(stub)

    const { alarmAt, retryState } = await runInDurableObject(stub, async (_instance, state) => {
      const alarmAt = await state.storage.getAlarm()
      const retryState = await state.storage.get<{ attempt: number; alarmStartedAt: number }>(
        'retry_state'
      )
      return { alarmAt, retryState }
    })

    expect(alarmAt).not.toBeNull()
    expect(alarmAt).toBeGreaterThanOrEqual(now + 15_000)
    expect(alarmAt).toBeLessThanOrEqual(now + 20_000)
    expect(retryState).toStrictEqual({
      attempt: 0,
      alarmStartedAt: expect.any(Number),
    })
    expect((retryState as { alarmStartedAt: number }).alarmStartedAt).toBeGreaterThanOrEqual(now)
  })
})
