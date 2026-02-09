import { describe, expect, it, vi } from 'vitest'
import type { ReserveDurableObject } from '../../../src'
import { deleteReserve } from '../../../src/reserve/service/reserve'

const createDbMock = (recordExists: boolean, deleteChanges: number): D1Database => {
  return {
    prepare: (query: string) => ({
      bind: () => ({
        first: async () =>
          query.startsWith('select')
            ? recordExists
              ? {
                  id: 1,
                  params: '{"name":"x"}',
                  executeAt: '2026-03-01T10:00:00.000Z',
                  status: 'pending',
                  doNamespace: 'RESERVE_DO',
                  doId: 'a'.repeat(64),
                  doScheduledAt: '2026-03-01T10:00:00.000Z',
                  createdAt: '2026-02-01T00:00:00.000Z',
                }
              : null
            : null,
        run: async () => ({ meta: { changes: deleteChanges } }),
      }),
    }),
  } as unknown as D1Database
}

const createReserveDoMock = () => {
  const durableObjectId = {
    toString: () => 'do-id-1',
  } as DurableObjectId

  const stub = {
    rollback: vi.fn(async () => {}),
  }

  const reserveDo = {
    idFromString: vi.fn(() => durableObjectId),
    get: vi.fn(() => stub),
  } as unknown as DurableObjectNamespace<ReserveDurableObject>

  return { reserveDo, stub }
}

describe('deleteReserve', () => {
  it('対象が存在する場合は DO を rollback して削除成功を返す', async () => {
    const db = createDbMock(true, 1)
    const { reserveDo, stub } = createReserveDoMock()

    const deleted = await deleteReserve(db, reserveDo, 1)

    expect(deleted).toBe(true)
    expect(stub.rollback).toHaveBeenCalledTimes(1)
  })

  it('対象が存在しない場合は false を返し DO rollback は呼ばれない', async () => {
    const db = createDbMock(false, 0)
    const { reserveDo, stub } = createReserveDoMock()

    const deleted = await deleteReserve(db, reserveDo, 1)

    expect(deleted).toBe(false)
    expect(stub.rollback).not.toHaveBeenCalled()
  })
})
