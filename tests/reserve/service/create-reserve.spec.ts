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
  it('正常系では予約を返し、DO rollback は呼ばれない', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: 10,
            params: '{"name":"Created"}',
            executeAt: payload.executeAt,
            status: 'pending',
            doNamespace: 'RESERVE_DO',
            doId: 'do-id-1',
            doScheduledAt: payload.executeAt,
            createdAt: '2026-02-01T00:00:00.000Z',
          }),
        }),
      }),
    } as unknown as D1Database
    const { reserveDo, stub } = createReserveDoMock()

    const reserve = await createReserve(db, reserveDo, payload)

    expect(reserve.id).toBe(10)
    expect(reserve.params).toStrictEqual({ name: 'Created' })
    expect(stub.schedule).toHaveBeenCalledTimes(1)
    expect(stub.rollback).not.toHaveBeenCalled()
  })

  it('正常系で params が JSON でない場合は文字列のまま返す', async () => {
    const db = {
      prepare: () => ({
        bind: () => ({
          first: async () => ({
            id: 11,
            params: 'not-json',
            executeAt: payload.executeAt,
            status: 'pending',
            doNamespace: 'RESERVE_DO',
            doId: 'do-id-1',
            doScheduledAt: payload.executeAt,
            createdAt: '2026-02-01T00:00:00.000Z',
          }),
        }),
      }),
    } as unknown as D1Database
    const { reserveDo, stub } = createReserveDoMock()

    const reserve = await createReserve(db, reserveDo, payload)

    expect(reserve.params).toBe('not-json')
    expect(stub.rollback).not.toHaveBeenCalled()
  })

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
      '予約レコードの登録に失敗しました'
    )

    expect(stub.schedule).toHaveBeenCalledTimes(1)
    expect(stub.rollback).toHaveBeenCalledTimes(1)
  })
})
