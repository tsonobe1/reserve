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
const AUTH_TOKEN = 'test-token'

const withAuth = (init: RequestInit = {}): RequestInit => {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${AUTH_TOKEN}`)
  return { ...init, headers }
}

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

  describe('Authentication', () => {
    it('認証ヘッダがない場合は 401 を返す', async () => {
      const response = await SELF.fetch(new Request('http://localhost:8787/reserves'))
      expect(response.status).toBe(401)
    })
  })

  describe('GET /reserves', () => {
    it('予約一覧が取得できる', async () => {
      const response = await SELF.fetch(new Request('http://localhost:8787/reserves', withAuth()))
      expect(response.status).toBe(200)

      const payload = (await response.json()) as {
        reserves: Array<ReserveRecord>
      }
      expect(payload.reserves).toHaveLength(1)
      expect(payload.reserves[0]?.id).toBe(seededReserveId)
    })
  })

  describe('GET /reserves/do/:doId', () => {
    it('DO から予約詳細(アラーム情報)を取得できる', async () => {
      const requestPayload = {
        params: { name: 'Get Detail Guest', contact: 'detail@example.com' },
        executeAt: '2026-03-02T10:00:00.000Z',
      }

      const createdResponse = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          ...withAuth({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
          }),
        })
      )
      expect(createdResponse.status).toBe(201)

      const created = (await createdResponse.json()) as { doId: string }

      const response = await SELF.fetch(
        new Request(`http://localhost:8787/reserves/do/${created.doId}`, withAuth())
      )
      expect(response.status).toBe(200)

      const payload = (await response.json()) as {
        reserve: { doId: string; params: unknown; alarmAt: number | null }
      }

      expect(payload.reserve.doId).toBe(created.doId)
      expect(payload.reserve.params).toStrictEqual(requestPayload.params)
      expect(payload.reserve.alarmAt).not.toBeNull()
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
          ...withAuth({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestPayload),
          }),
        })
      )

      expect(response.status).toBe(201)

      const payload = (await response.json()) as {
        id: number
        params: unknown
        executeAt: string
        status: string
        doId: string
      }

      expect(payload.id).toBeTruthy()
      expect(payload.params).toStrictEqual(requestPayload.params)
      expect(payload.executeAt).toBe(requestPayload.executeAt)
      expect(payload.status).toBe('pending')

      const reserveDo = env.RESERVE_DO
      const stub = reserveDo.get(reserveDo.idFromString(payload.doId))
      const doState = await stub.getState()

      expect(doState.params).toStrictEqual(requestPayload.params)
      expect(doState.alarmAt).not.toBeNull()
    })

    it('params がオブジェクトでない場合は 400 を返す', async () => {
      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          ...withAuth({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              params: 'not-an-object',
            }),
          }),
        })
      )

      expect(response.status).toBe(400)
    })

    it('status を指定しても pending で作成される', async () => {
      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          ...withAuth({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              params: { name: 'Force Pending' },
              executeAt: '2026-03-01T11:00:00.000Z',
              status: 'done',
            }),
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
          ...withAuth({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              params: { name: 'Missing Execute At' },
            }),
          }),
        })
      )

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE /reserves/:id', () => {
    it('予約を削除すると DO の設定も削除される', async () => {
      const createResponse = await SELF.fetch(
        new Request('http://localhost:8787/reserves', {
          ...withAuth({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              params: { name: 'Delete Target' },
              executeAt: '2026-03-03T10:00:00.000Z',
            }),
          }),
        })
      )
      expect(createResponse.status).toBe(201)

      const created = (await createResponse.json()) as {
        id: number
        doId: string
      }

      const response = await SELF.fetch(
        new Request(`http://localhost:8787/reserves/${created.id}`, {
          ...withAuth({ method: 'DELETE' }),
        })
      )

      expect(response.status).toBe(200)

      const payload = (await response.json()) as {
        message: string
      }

      expect(payload.message).toBe(`Reserve ${created.id} deleted`)

      const reserveDo = env.RESERVE_DO
      const stub = reserveDo.get(reserveDo.idFromString(created.doId))
      const doState = await stub.getState()

      expect(doState.params).toBeNull()
      expect(doState.alarmAt).toBeNull()
    })

    it('存在しない予約の削除は 404 を返す', async () => {
      const response = await SELF.fetch(
        new Request('http://localhost:8787/reserves/999999', {
          ...withAuth({ method: 'DELETE' }),
        })
      )

      expect(response.status).toBe(404)
    })
  })
})
