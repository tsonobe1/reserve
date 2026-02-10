import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { HTTPException } from 'hono/http-exception'
import page from './ui/controller/page'
import reserves from './reserve/controller/reserve'
import { ReserveDurableObject } from './reserve/durable-object/reserve-durable-object'

const app = new Hono()

app.use(
  '/reserves',
  bearerAuth({
    verifyToken: async (token, c) => token === c.env.AUTH_TOKEN,
    noAuthenticationHeader: {
      message: '認証情報がありません',
    },
    invalidAuthenticationHeader: {
      message: '認証ヘッダーの形式が不正です',
    },
    invalidToken: {
      message: '認証トークンが不正です',
    },
  })
)
app.use(
  '/reserves/*',
  bearerAuth({
    verifyToken: async (token, c) => token === c.env.AUTH_TOKEN,
    noAuthenticationHeader: {
      message: '認証情報がありません',
    },
    invalidAuthenticationHeader: {
      message: '認証ヘッダーの形式が不正です',
    },
    invalidToken: {
      message: '認証トークンが不正です',
    },
  })
)

// 想定外の例外はここで一元処理し、ルート側は想定内の 4xx 応答に集中する
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }

  console.error(err)
  return c.json({ error: 'サーバー内部でエラーが発生しました' }, 500)
})

app.route('/reserves', reserves)
app.route('/', page)

export default app
export { ReserveDurableObject }
