import { Hono } from 'hono'
import { Layout } from '../components/layout'
import { ReservePage } from '../components/reserve-page'

const page = new Hono()

page.get('/', (c) => {
  return c.html(
    <Layout>
      <ReservePage />
    </Layout>,
  )
})

export default page
