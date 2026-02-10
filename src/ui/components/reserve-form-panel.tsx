import type { FC } from 'hono/jsx'

export const ReserveFormPanel: FC = () => {
  return (
    <section class='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
      <h2 class='text-lg font-semibold'>予約登録</h2>
      <p class='mt-1 text-sm text-slate-500'>条件を入力して予約を作成します。</p>

      <form class='mt-5 space-y-4'>
        <div>
          <label for='executeAt' class='mb-1 block text-sm font-medium text-slate-700'>
            実行日時
          </label>
          <input
            id='executeAt'
            type='datetime-local'
            class='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring'
          />
        </div>

        <div>
          <label for='params' class='mb-1 block text-sm font-medium text-slate-700'>
            パラメータ(JSON)
          </label>
          <textarea
            id='params'
            rows={6}
            placeholder='{"key":"value"}'
            class='w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm outline-none ring-slate-300 focus:ring'
          />
        </div>

        <button
          type='button'
          class='w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90'
        >
          登録する
        </button>
      </form>
    </section>
  )
}
