import { Hono } from 'hono'
import type { Context } from 'hono'
import { ReserveRecord } from './types/reserve'

type Bindings = {
  reserve: D1Database
}

const app = new Hono<{ Bindings: Bindings }>()

const parseJson = async <T>(c: Context<{ Bindings: Bindings }>): Promise<T> => {
  try {
    return await c.req.json<T>()
  } catch {
    throw new Error('Invalid JSON payload')
  }
}

// GET all reserves
app.get('/reserves', async (c) => {
  try {
    const query = `SELECT id,
                          params,
                          execute_at,
                          status,
                          alarm_namespace,
                          alarm_object_id,
                          alarm_scheduled_at,
                          created_at
                   FROM reserves
                   ORDER BY execute_at DESC`
    const { results } = await c.env.reserve.prepare(query).all<ReserveRecord>()

    const reserves = (results ?? []).map((record) => {
      try {
        return { ...record, params: JSON.parse(record.params) }
      } catch {
        return record
      }
    })

    return c.json({ reserves })
  } catch (error) {
    return c.json({ error: 'Failed to fetch reserves', details: `${error}` }, 500)
  }
})

// GET single reserve
app.get('/reserve/:id', async (c) => {
  const id = Number(c.req.param('id'))

  if (Number.isNaN(id)) {
    return c.json({ error: 'Invalid reserve id' }, 400)
  }

  try {
    const { results } = await c.env.reserve
      .prepare(
        `SELECT id, params, execute_at, status, alarm_namespace, alarm_object_id,
        alarm_scheduled_at, created_at FROM reserves WHERE id = ?1`
      )
      .bind(id)
      .all<ReserveRecord>()

    const reserve = results?.[0]

    if (!reserve) {
      return c.json({ error: 'Reserve not found' }, 404)
    }

    let parsedParams: unknown = reserve.params

    try {
      parsedParams = JSON.parse(reserve.params)
    } catch {
      parsedParams = reserve.params
    }

    return c.json({ reserve: { ...reserve, params: parsedParams } })
  } catch (error) {
    return c.json({ error: 'Failed to fetch reserve', details: `${error}` }, 500)
  }
})

// POST create reserve
app.post('/reserve', async (c) => {
  type Payload = {
    params?: unknown
    execute_at?: string
    status?: string
    alarm_namespace?: string
    alarm_object_id?: string
    alarm_scheduled_at?: string
  }

  let payload: Payload

  try {
    payload = await parseJson<Payload>(c)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }

  if (typeof payload.params === 'undefined') {
    return c.json({ error: 'params is required' }, 400)
  }

  const paramsJson =
    typeof payload.params === 'string' ? payload.params : JSON.stringify(payload.params)

  const executeAt = payload.execute_at ?? new Date().toISOString()
  const status = payload.status ?? 'pending'
  const alarmNamespace = payload.alarm_namespace ?? 'reserve'
  const alarmObjectId = payload.alarm_object_id ?? crypto.randomUUID()
  const alarmScheduledAt = payload.alarm_scheduled_at ?? executeAt
  const createdAt = new Date().toISOString()

  try {
    const inserted = await c.env.reserve
      .prepare(
        `INSERT INTO reserves (
        params, execute_at, status, alarm_namespace, alarm_object_id, alarm_scheduled_at, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING id`
      )
      .bind(
        paramsJson,
        executeAt,
        status,
        alarmNamespace,
        alarmObjectId,
        alarmScheduledAt,
        createdAt
      )
      .first<{ id: number }>()

    return c.json(
      {
        id: inserted?.id,
        params: payload.params,
        execute_at: executeAt,
        status,
        alarm_namespace: alarmNamespace,
        alarm_object_id: alarmObjectId,
        alarm_scheduled_at: alarmScheduledAt,
        created_at: createdAt,
      },
      201
    )
  } catch (error) {
    return c.json({ error: 'Failed to create reserve', details: `${error}` }, 500)
  }
})

// DELETE reserve
app.delete('/reserve/:id', async (c) => {
  const id = Number(c.req.param('id'))

  if (Number.isNaN(id)) {
    return c.json({ error: 'Invalid reserve id' }, 400)
  }

  try {
    const result = await c.env.reserve.prepare('DELETE FROM reserves WHERE id = ?1').bind(id).run()

    if (!result.success || (result.meta?.changes ?? 0) === 0) {
      return c.json({ error: 'Reserve not found' }, 404)
    }

    return c.json({ message: `Reserve ${id} deleted` })
  } catch (error) {
    return c.json({ error: 'Failed to delete reserve', details: `${error}` }, 500)
  }
})

export default app
