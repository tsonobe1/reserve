import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import {
  ReserveCreatePayloadSchema,
  ReserveDoIdParamSchema,
  ReserveIdParamSchema,
} from '../domain/reserve-request-schema'
import { createReserve, deleteReserve, getReserve, getReserves } from '../service/reserve'

const reserves = new Hono<{ Bindings: CloudflareBindings }>()
// GET all reserves
reserves.get('/', async (c) => {
  const reserves = await getReserves(c.env.reserve)
  return c.json({ reserves })
})

// GET reserve alarm detail
reserves.get(
  '/do/:doId',
  zValidator('param', ReserveDoIdParamSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          error: '予約 doId が不正です',
          details: z.flattenError(result.error),
        },
        400
      )
    }
  }),
  async (c) => {
    const { doId } = c.req.valid('param')
    const reserve = await getReserve(c.env.RESERVE_DO, doId)

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
          error: '予約ペイロードが不正です',
          details: z.flattenError(result.error),
        },
        400
      )
    }
  }),
  async (c) => {
    const payload = c.req.valid('json')
    const reserve = await createReserve(c.env.reserve, c.env.RESERVE_DO, payload)
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
          error: '予約 id が不正です',
          details: z.flattenError(result.error),
        },
        400
      )
    }
  }),
  async (c) => {
    const { id } = c.req.valid('param')

    const deleted = await deleteReserve(c.env.reserve, c.env.RESERVE_DO, id)
    if (!deleted) {
      return c.json({ error: '予約が見つかりません' }, 404)
    }

    return c.json({ message: `Reserve ${id} deleted` })
  }
)

export default reserves
