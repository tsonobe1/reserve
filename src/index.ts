import { Hono } from 'hono'
import reserves from './reserve/controller/reserve'

const app = new Hono()

app.route('/reserves', reserves)

export default app
