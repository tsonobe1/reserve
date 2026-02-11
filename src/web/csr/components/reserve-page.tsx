import { ReserveFormPanel } from './reserve-form-panel'
import { ReserveListPanel } from './reserve-list-panel'

export const ReservePage = () => {
  return (
    <main class="mx-auto max-w-6xl px-6 py-10">
      <h1 class="text-3xl font-bold tracking-tight">Reserve</h1>

      <div class="mt-8 grid gap-6 md:grid-cols-[minmax(320px,420px)_1fr]">
        <ReserveFormPanel />
        <ReserveListPanel />
      </div>
    </main>
  )
}
