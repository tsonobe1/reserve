import { render } from 'hono/jsx/dom'
import { ReservePage } from './components/reserve-page'

const mount = document.getElementById('app')
if (mount) {
  render(<ReservePage />, mount)
}
