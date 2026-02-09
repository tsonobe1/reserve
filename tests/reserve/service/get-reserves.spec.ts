import { describe, expect, it } from 'vitest'
import type { ReserveRow } from '../../../src/reserve/repository/reserve'
import { getReserves } from '../../../src/reserve/service/reserve'

const createMockDbWithRows = (rows: ReserveRow[]): D1Database => {
  return {
    prepare: () => ({
      all: async () => ({ results: rows }),
    }),
  } as unknown as D1Database
}

describe('getReserves', () => {
  it('params が JSON 文字列ならオブジェクトに復元して返す', async () => {
    const db = createMockDbWithRows([
      {
        id: 1,
        params: '{"name":"Alice"}',
        executeAt: '2026-03-01T10:00:00.000Z',
        status: 'pending',
        doNamespace: 'RESERVE_DO',
        doId: 'do-id-1',
        doScheduledAt: '2026-03-01T10:00:00.000Z',
        createdAt: '2026-02-01T10:00:00.000Z',
      },
    ])

    const reserves = await getReserves(db)

    expect(reserves).toHaveLength(1)
    expect(reserves[0]?.params).toStrictEqual({ name: 'Alice' })
  })

  it('params が JSON でない場合は文字列のまま返す', async () => {
    const db = createMockDbWithRows([
      {
        id: 2,
        params: 'not-json',
        executeAt: '2026-03-02T10:00:00.000Z',
        status: 'pending',
        doNamespace: 'RESERVE_DO',
        doId: 'do-id-2',
        doScheduledAt: '2026-03-02T10:00:00.000Z',
        createdAt: '2026-02-01T11:00:00.000Z',
      },
    ])

    const reserves = await getReserves(db)

    expect(reserves).toHaveLength(1)
    expect(reserves[0]?.params).toBe('not-json')
  })
})
