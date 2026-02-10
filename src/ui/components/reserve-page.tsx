import type { FC } from 'hono/jsx'
import { ReserveFormPanel } from './reserve-form-panel'
import { ReserveListPanel } from './reserve-list-panel'

export const ReservePage: FC = () => {
  return (
    <main class='mx-auto max-w-6xl px-6 py-10'>
      <h1 class='text-3xl font-bold tracking-tight'>Reserve</h1>
      <p class='mt-2 text-slate-600'>予約登録と一覧表示のUI骨組みです。</p>

      <div class='mt-8 grid gap-6 md:grid-cols-[minmax(320px,420px)_1fr]'>
        <ReserveFormPanel />
        <ReserveListPanel />
      </div>
    </main>
  )
}
