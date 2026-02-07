import {beforeEach, describe, expect, it} from 'vitest'
import {SELF, env} from 'cloudflare:test'
import schemaSql from '../schema.sql?raw'
import type { ReserveRecord } from '../src/types/reserve'

const schemaStatements = schemaSql
    .split(';')
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0)

const SEEDED_TIMESTAMP = '2026-02-07T00:00:00.000Z'

describe('GET /reserves', () => {
    beforeEach(async () => {
        for (const statement of schemaStatements) {
            await env.reserve.prepare(`${statement};`).run()
        }

        await env.reserve.prepare('delete from reserves').run()

        await env.reserve
            .prepare(
                `insert into reserves (params,
                                       execute_at,
                                       status,
                                       alarm_namespace,
                                       alarm_object_id,
                                       alarm_scheduled_at,
                                       created_at)
                 values (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
            )
            .bind(
                JSON.stringify({name: 'Test Guest', contact: 'guest@example.com'}),
                SEEDED_TIMESTAMP,
                'pending',
                'test-namespace',
                'test-object-id',
                SEEDED_TIMESTAMP,
                SEEDED_TIMESTAMP
            )
            .run()
    })

    it('予約一覧が取得できる', async () => {
        const response = await SELF.fetch(new Request('http://localhost:8787/reserves'))
        expect(response.status).toBe(200)

        const payload = (await response.json()) as {
            reserves: Array<ReserveRecord>
        }

        expect(payload.reserves).toHaveLength(1)
    })
})
