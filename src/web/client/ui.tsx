import { render, useEffect, useState } from 'hono/jsx/dom'

const timeOptions = Array.from({ length: 17 }, (_, i) => {
  const hour = String(i + 7).padStart(2, '0')
  return `${hour}:00`
})

const pad2 = (n: number) => String(n).padStart(2, '0')

const addHours = (hhmm: string, hours: number): string | null => {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null

  const total = h + hours
  if (total > 23) return null

  return `${pad2(total)}:${pad2(m)}`
}

const toExecuteAtJst = (yyyyMmDd: string): string => {
  const [year, month, day] = yyyyMmDd.split('-').map(Number)
  const baseUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0)
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000
  const targetUtcMs = baseUtcMs - sixtyDaysMs
  const jst = new Date(targetUtcMs + 9 * 60 * 60 * 1000)

  return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}T${pad2(jst.getUTCHours())}:${pad2(jst.getUTCMinutes())}`
}

type CourtSelectorProps = {
  value: string
  onSelect: (value: string) => void
}

const CourtSelector = ({ value, onSelect }: CourtSelectorProps) => {
  return (
    <div>
      <p class="mb-2 block text-sm font-medium text-slate-700">コート</p>
      <div class="grid grid-cols-2 gap-2">
        {['1', '2', '3', '4'].map((court) => {
          const isActive = value === court
          return (
            <button
              type="button"
              onClick={() => onSelect(court)}
              aria-pressed={isActive}
              class={`rounded-lg border px-3 py-2 text-sm transition ${
                isActive
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              第{court}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const ReserveFormPanel = () => {
  const [court, setCourt] = useState('1')
  const [reserveDate, setReserveDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [executeAt, setExecuteAt] = useState('')

  useEffect(() => {
    if (!reserveDate) return
    setExecuteAt(toExecuteAtJst(reserveDate))
  }, [reserveDate])

  useEffect(() => {
    if (!startTime) return
    const suggested = addHours(startTime, 2)
    if (!suggested) return
    if (timeOptions.includes(suggested)) {
      setEndTime(suggested)
    }
  }, [startTime])

  return (
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold">予約登録</h2>
      <p class="mt-1 text-sm text-slate-500">条件を入力して予約を作成します。</p>

      <form id="reserveForm" class="mt-5 space-y-4">
        <div>
          <label for="facility" class="mb-1 block text-sm font-medium text-slate-700">
            対象施設
          </label>
          <select
            id="facility"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            value="1"
          >
            <option value="1">国立代々木競技場フットサルコート</option>
          </select>
        </div>

        <CourtSelector value={court} onSelect={setCourt} />
        <input id="court" name="court" type="hidden" value={court} />

        <div>
          <label for="reserveDate" class="mb-1 block text-sm font-medium text-slate-700">
            予約したい日
          </label>
          <input
            id="reserveDate"
            type="date"
            value={reserveDate}
            onInput={(e) => setReserveDate((e.target as HTMLInputElement).value)}
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="startTime" class="mb-1 block text-sm font-medium text-slate-700">
              開始時間
            </label>
            <select
              id="startTime"
              value={startTime}
              onInput={(e) => setStartTime((e.target as HTMLSelectElement).value)}
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            >
              <option value="">選択してください</option>
              {timeOptions.map((time) => (
                <option value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div>
            <label for="endTime" class="mb-1 block text-sm font-medium text-slate-700">
              終了時間
            </label>
            <select
              id="endTime"
              value={endTime}
              onInput={(e) => setEndTime((e.target as HTMLSelectElement).value)}
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            >
              <option value="">選択してください</option>
              {timeOptions.map((time) => (
                <option value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label for="executeAt" class="mb-1 block text-sm font-medium text-slate-700">
            予約実行日時
          </label>
          <input
            id="executeAt"
            type="datetime-local"
            value={executeAt}
            onInput={(e) => setExecuteAt((e.target as HTMLInputElement).value)}
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
          />
          <p class="mt-1 text-xs text-slate-500">
            予約したい日を入力すると、60日前の 00:00:00 が自動設定されます。
          </p>
        </div>

        <button
          type="button"
          class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          登録する
        </button>
      </form>
    </section>
  )
}

const ReserveListPanel = () => {
  return (
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">予約一覧</h2>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          再読み込み
        </button>
      </div>
      <p class="mt-1 text-sm text-slate-500">作成済みの予約を表示します。</p>

      <div class="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        予約データはここに表示されます
      </div>
    </section>
  )
}

const ReservePage = () => {
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

const mount = document.getElementById('app')
if (mount) {
  render(<ReservePage />, mount)
}
