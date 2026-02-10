import type { FC } from 'hono/jsx'

export const ReserveListPanel: FC = () => {
  return (
    <section class='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
      <div class='flex items-center justify-between'>
        <h2 class='text-lg font-semibold'>予約一覧</h2>
        <button
          type='button'
          class='rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50'
        >
          再読み込み
        </button>
      </div>
      <p class='mt-1 text-sm text-slate-500'>作成済みの予約を表示します。</p>

      <div class='mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500'>
        予約データはここに表示されます
      </div>
    </section>
  )
}
