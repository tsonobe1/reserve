import { beforeEach, describe, expect, it } from 'vitest'
import { SELF, env } from 'cloudflare:test'
import schemaSql from '../schema.sql?raw'
import type { ReserveRecord } from '../src/reserve/domain/reserve'

const schemaStatements = schemaSql
  .split(';')
  .map((stmt) => stmt.trim())
  .filter((stmt) => stmt.length > 0)

const SEEDED_TIMESTAMP = '2026-02-07T00:00:00.000Z'
const SEEDED_PARAMS = { name: 'Test Guest', contact: 'guest@example.com' }

const applySchema = async () => {
  for (const statement of schemaStatements) {
    await env.reserve.prepare(`${statement};`).run()
  }
}

const resetReserves = async () => {
  await env.reserve.prepare('delete from reserves').run()
}

const seed = async (): Promise<number> => {
  const inserted = await env.reserve
    .prepare(
      `insert into reserves (params,
                             execute_at,
                             status,
                             do_namespace,
                             do_id,
                             do_scheduled_at,
                             created_at)
       values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       returning id`
    )
    .bind(
      JSON.stringify(SEEDED_PARAMS),
      SEEDED_TIMESTAMP,
      'pending',
      'test-namespace',
      'test-object-id',
      SEEDED_TIMESTAMP,
      SEEDED_TIMESTAMP
    )
    .first<{ id: number }>()

  if (!inserted?.id) {
    throw new Error('Failed to seed reserve record for tests')
  }

  return inserted.id
}

describe('Reserve API', () => {
  let seededReserveId: number

  beforeEach(async () => {
    await applySchema()
    await resetReserves()
    seededReserveId = await seed()
  })

  describe('GET /reserves', () => {
    it('予約一覧が取得できる', async () => {
      const response = await SELF.fetch(new Request('http://localhost:8787/reserves'))
      expect(response.status).toBe(200)

      const payload = (await response.json()) as {
        reserves: Array<ReserveRecord>
      }
      expect(payload.reserves).toHaveLength(1)
      expect(payload.reserves[0]?.id).toBe(seededReserveId)
    })
  })

  describe('GET /reserves/:id', () => {
    it('予約詳細が取得できる', async () => {
      const response = await SELF.fetch(
        new Request(`http://localhost:8787/reserves/${seededReserveId}`)
      )
      expect(response.status).toBe(200)

      const payload = (await response.json()) as {
        reserve: ReserveRecord & { params: unknown }
      }

      expect(payload.reserve.id).toBe(seededReserveId)
      expect(payload.reserve.params).toStrictEqual(SEEDED_PARAMS)
    })
  })

  describe('POST /reserves', () => {
    it('予約を作成できる', async () => {
      const requestPayload = {
        params: { name: 'New Guest', contact: 'new@example.com' },
        executeAt: '2026-03-01T10:00:00.000Z',
        status: 'pending',
      }

      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        })
      )

      expect(response.status).toBe(201)

      const payload = (await response.json()) as {
        id: number
        params: unknown
        executeAt: string
        status: string
      }

      expect(payload.id).toBeTruthy()
      expect(payload.params).toStrictEqual(requestPayload.params)
      expect(payload.executeAt).toBe(requestPayload.executeAt)
      expect(payload.status).toBe('pending')
    })

    it('params がオブジェクトでない場合は 400 を返す', async () => {
      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            params: 'not-an-object',
          }),
        })
      )

      expect(response.status).toBe(400)
    })

    it('status を指定しても pending で作成される', async () => {
      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            params: { name: 'Force Pending' },
            executeAt: '2026-03-01T11:00:00.000Z',
            status: 'done',
          }),
        })
      )

      expect(response.status).toBe(201)

      const payload = (await response.json()) as {
        status: string
      }

      expect(payload.status).toBe('pending')
    })

    it('executeAt が未指定の場合は 400 を返す', async () => {
      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            params: { name: 'Missing Execute At' },
          }),
        })
      )

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /reserves/:id', () => {
    it('予約を削除できる', async () => {
      const response = await SELF.fetch(
        new Request(`http://localhost:8787/reserves/${seededReserveId}`, {
          method: 'DELETE',
        })
      )

      expect(response.status).toBe(200)

      const payload = (await response.json()) as {
        message: string
      }

      expect(payload.message).toBe(`Reserve ${seededReserveId} deleted`)
    })

    it('存在しない予約の削除は 404 を返す', async () => {
      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves/999999', {
          method: 'DELETE',
        })
      )

      expect(response.status).toBe(404)
    })
  })
})
