import { Hono } from 'hono'
import type { Context } from 'hono'
import { ReservePayloadSchema } from '../domain/reserve-payload'
import { createReserve, getReserve, getReserves } from '../service/reserve'

type Bindings = {
  reserve: D1Database
}

const reserves = new Hono<{ Bindings: Bindings }>()

const parseJson = async (c: Context<{ Bindings: Bindings }>): Promise<unknown> => {
  try {
    return await c.req.json()
  } catch {
    throw new Error('Invalid JSON payload')
  }
}

// GET all reserves
reserves.get('/', async (c) => {
  try {
    const reserves = await getReserves(c.env.reserve)
    return c.json({ reserves })
  } catch (error) {
    return c.json({ error: 'Failed to fetch reserves', details: `${error}` }, 500)
  }
})

// GET single reserve
reserves.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))

  if (Number.isNaN(id)) {
    return c.json({ error: 'Invalid reserve id' }, 400)
  }

  try {
    const reserve = await getReserve(c.env.reserve, id)

    if (!reserve) {
      return c.json({ error: 'Reserve not found' }, 404)
    }

    return c.json({ reserve })
  } catch (error) {
    return c.json({ error: 'Failed to fetch reserve', details: `${error}` }, 500)
  }
})

// POST create reserve
reserves.post('/', async (c) => {
  let payload: unknown

  try {
    payload = await parseJson(c)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400)
  }

  const result = ReservePayloadSchema.safeParse(payload)

  if (!result.success) {
    return c.json(
      {
        error: 'Invalid reserve payload',
        details: result.error.flatten(),
      },
      400
    )
  }

  try {
    const reserve = await createReserve(c.env.reserve, result.data)
    return c.json(reserve, 201)
  } catch (error) {
    return c.json({ error: 'Failed to create reserve', details: `${error}` }, 500)
  }
})

// DELETE reserve
reserves.delete('/:id', async (c) => {
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

export default reserves
