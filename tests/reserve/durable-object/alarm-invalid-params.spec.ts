import { describe, expect, it } from 'vitest'
import { env, runInDurableObject } from 'cloudflare:test'

describe('ReserveDurableObject.alarm invalid params', () => {
  it('params が不正な場合は throw せず終了する', async () => {
    const stub = env.RESERVE_DO.get(env.RESERVE_DO.newUniqueId())

    const { retryState, alarmAt } = await runInDurableObject(stub, async (instance, state) => {
      await state.storage.put('params', {
        invalid: true,
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
