import { beforeEach, describe, expect, it } from 'vitest'
import { SELF, env } from 'cloudflare:test'

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS reserves (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact TEXT,
  reserved_at TEXT NOT NULL
);
`

const SEEDED_TIMESTAMP = '2026-02-07T00:00:00.000Z'

describe('GET /reserves', () => {
  beforeEach(async () => {
    await env.reserve.prepare(CREATE_TABLE_SQL).run()
    await env.reserve.prepare('DELETE FROM reserves').run()

    await env.reserve
      .prepare('INSERT INTO reserves (name, contact, reserved_at) VALUES (?1, ?2, ?3)')
      .bind('Test Guest', 'guest@example.com', SEEDED_TIMESTAMP)
      .run()
  })

  it('予約一覧が取得できる', async () => {
    const response = await SELF.fetch(new Request('http://example.com/reserves'))
    expect(response.status).toBe(200)

    const payload = (await response.json()) as { reserves: Array<Record<string, unknown>> }
    expect(Array.isArray(payload.reserves)).toBe(true)
    expect(payload.reserves).toHaveLength(1)
    expect(payload.reserves[0]).toMatchObject({
      name: 'Test Guest',
      contact: 'guest@example.com',
      reserved_at: SEEDED_TIMESTAMP,
    })
  })
})


