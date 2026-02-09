import { describe, expect, it, vi } from 'vitest'
import type { ReserveDurableObject } from '../../../src'
import { createReserve } from '../../../src/reserve/service/reserve'

const payload = {
  params: { name: 'Rollback Target' },
  executeAt: '2026-03-01T10:00:00.000Z',
}

const createReserveDoMock = () => {
  const durableObjectId = {
    toString: () => 'do-id-1',
  } as DurableObjectId

  const stub = {
    schedule: vi.fn(async () => {}),
    rollback: vi.fn(async () => {}),
  }

  const reserveDo = {
    idFromName: vi.fn(() => durableObjectId),
    idFromString: vi.fn(() => durableObjectId),
    get: vi.fn(() => stub),
  } as unknown as DurableObjectNamespace<ReserveDurableObject>

  return { reserveDo, stub }
}

describe('createReserve rollback', () => {
  it('D1 insert が例外を投げたら DO を rollback する', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => {
            throw new Error('insert failed')
          },
        }),
      }),
    } as unknown as D1Database
    const { reserveDo, stub } = createReserveDoMock()

    await expect(createReserve(db, reserveDo, payload)).rejects.toThrow('insert failed')

    expect(stub.schedule).toHaveBeenCalledTimes(1)
    expect(stub.rollback).toHaveBeenCalledTimes(1)
  })

  it('D1 insert が null を返したら DO を rollback する', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => null,
        }),
      }),
    } as unknown as D1Database
    const { reserveDo, stub } = createReserveDoMock()

    await expect(createReserve(db, reserveDo, payload)).rejects.toThrow(
      'Failed to insert reserve record'
    )

    expect(stub.schedule).toHaveBeenCalledTimes(1)
    expect(stub.rollback).toHaveBeenCalledTimes(1)
  })
})
