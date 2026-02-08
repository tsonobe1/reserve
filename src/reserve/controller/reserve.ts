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
  const reserves = await getReserves(c.env.reserve)
  return c.json({ reserves })
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

    const reserve = await getReserve(c.env.reserve, id)

    if (!reserve) {
      return c.json({ error: 'Reserve not found' }, 404)
    }

    return c.json({ reserve })
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
    const reserve = await createReserve(c.env.reserve, payload)
    return c.json(reserve, 201)
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

    const deleted = await deleteReserve(c.env.reserve, id)
    if (!deleted) {
      return c.json({ error: 'Reserve not found' }, 404)
    }

    return c.json({ message: `Reserve ${id} deleted` })
  }
)

export default reserves
