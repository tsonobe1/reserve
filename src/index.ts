import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import reserves from './reserve/controller/reserve'
import { ReserveDurableObject } from './reserve/durable-object/reserve-durable-object'

const app = new Hono()

// 想定外の例外はここで一元処理し、ルート側は想定内の 4xx 応答に集中する
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

app.route('/reserves', reserves)

export default app
export { ReserveDurableObject }
