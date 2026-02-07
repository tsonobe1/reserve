import { Hono } from 'hono'

type Bindings = {
  reserve: D1Database
}

interface Reserve {
  id: number
  name: string
  contact?: string | null
  reserved_at: string
}

const app = new Hono<{ Bindings: Bindings }>()

const parseJson = async <T>(c: any): Promise<T> => {
  try {
    return await c.req.json<T>()
  } catch (error) {
    throw new Error('Invalid JSON payload')
  }
}

// GET all reserves
app.get('/reserves', async (c) => {
  try {
    const query = 'SELECT id, name, contact, reserved_at FROM reserves ORDER BY reserved_at DESC'
    const { results } = await c.env.reserve.prepare(query).all<Reserve>()

    return c.json({ reserves: results ?? [] })
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
      .prepare('SELECT id, name, contact, reserved_at FROM reserves WHERE id = ?1')
      .bind(id)
      .all<Reserve>()

    const reserve = results?.[0]

    if (!reserve) {
      return c.json({ error: 'Reserve not found' }, 404)
    }

    return c.json({ reserve })
  } catch (error) {
    return c.json({ error: 'Failed to fetch reserve', details: `${error}` }, 500)
  }
})

// POST create reserve
app.post('/reserve', async (c) => {
  let payload: { name?: string; contact?: string; reserved_at?: string }

  try {
    payload = await parseJson<typeof payload>(c)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }

  const { name, contact = null, reserved_at } = payload

  if (!name) {
    return c.json({ error: 'name is required' }, 400)
  }

  const reservedAtIso = reserved_at ?? new Date().toISOString()

  try {
    const inserted = await c.env.reserve
      .prepare('INSERT INTO reserves (name, contact, reserved_at) VALUES (?1, ?2, ?3) RETURNING id')
      .bind(name, contact, reservedAtIso)
      .first<{ id: number }>()

    return c.json({ id: inserted?.id, name, contact, reserved_at: reservedAtIso }, 201)
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
