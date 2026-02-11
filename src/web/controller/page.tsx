import { Hono } from 'hono'
import { Layout } from '../components/layout'

const page = new Hono()

page.get('/', (c) => {
  return c.html(
    <Layout>
      <div id="app" />
    </Layout>
  )
})

export default page
