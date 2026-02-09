import { describe, expect, it, vi } from 'vitest'
import type { ReserveDurableObject } from '../../../src'
import { getReserve } from '../../../src/reserve/service/reserve'

const createReserveDoMock = (state: { params: unknown; alarmAt: number | null }) => {
  const durableObjectId = {
    toString: () => 'do-id-1',
  } as DurableObjectId

  const stub = {
    getState: vi.fn(async () => state),
  }

  const reserveDo = {
    idFromString: vi.fn(() => durableObjectId),
    get: vi.fn(() => stub),
  } as unknown as DurableObjectNamespace<ReserveDurableObject>

  return { reserveDo, stub }
}

describe('getReserve', () => {
  it('DO の状態から予約詳細を返す', async () => {
    const { reserveDo, stub } = createReserveDoMock({
      params: { name: 'From DO' },
      alarmAt: 1760000000000,
    })

    const reserve = await getReserve(reserveDo, 'a'.repeat(64))

    expect(reserve.doId).toBe('a'.repeat(64))
    expect(reserve.params).toStrictEqual({ name: 'From DO' })
    expect(reserve.alarmAt).toBe(1760000000000)
    expect(stub.getState).toHaveBeenCalledTimes(1)
  })
})
