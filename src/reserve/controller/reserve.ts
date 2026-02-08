import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { ReserveCreatePayloadSchema, ReserveIdParamSchema } from '../domain/reserve-request-schema'
import { createReserve, deleteReserve, getReserve, getReserves } from '../service/reserve'

type Bindings = {
  reserve: D1Database
}

const reserves = new Hono<{ Bindings: Bindings }>()
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
reserves.get(
  '/:id',
  zValidator('param', ReserveIdParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid reserve id',
          details: z.flattenError(result.error),
        },
        400
      )
    }
  }),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const reserve = await getReserve(c.env.reserve, id)

      if (!reserve) {
        return c.json({ error: 'Reserve not found' }, 404)
      }

      return c.json({ reserve })
    } catch (error) {
      return c.json({ error: 'Failed to fetch reserve', details: `${error}` }, 500)
    }
  }
)

// POST create reserve
reserves.post(
  '/',
  zValidator('json', ReserveCreatePayloadSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid reserve payload',
          details: z.flattenError(result.error),
        },
        400
      )
    }
  }),
  async (c) => {
    const payload = c.req.valid('json')

    try {
      const reserve = await createReserve(c.env.reserve, payload)
      return c.json(reserve, 201)
    } catch (error) {
      return c.json({ error: 'Failed to create reserve', details: `${error}` }, 500)
    }
  }
)

// DELETE reserve
reserves.delete(
  '/:id',
  zValidator('param', ReserveIdParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: 'Invalid reserve id',
          details: z.flattenError(result.error),
        },
        400
      )
    }
  }),
  async (c) => {
    const { id } = c.req.valid('param')

    try {
      const deleted = await deleteReserve(c.env.reserve, id)
      if (!deleted) {
        return c.json({ error: 'Reserve not found' }, 404)
      }

      return c.json({ message: `Reserve ${id} deleted` })
    } catch (error) {
      return c.json({ error: 'Failed to delete reserve', details: `${error}` }, 500)
    }
  }
)

export default reserves
