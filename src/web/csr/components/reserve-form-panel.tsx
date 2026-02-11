import { useEffect, useState } from 'hono/jsx/dom'
import { addHours, toExecuteAtJst } from '../lib/date-time'
import { CourtSelector } from './court-selector'

const timeOptions = Array.from({ length: 17 }, (_, i) => {
  const hour = String(i + 7).padStart(2, '0')
  return `${hour}:00`
})

type ReserveFormPanelProps = {
  token: string
  onTokenChange: (value: string) => void
}

export const ReserveFormPanel = ({ token, onTokenChange }: ReserveFormPanelProps) => {
  const [court, setCourt] = useState('1')
  const [reserveDate, setReserveDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [executeAt, setExecuteAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

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

  const handleSubmit = async (e: Event) => {
    e.preventDefault()
    if (!token) {
      setMessage('Bearerトークンを入力してください。')
      return
    }
    if (!reserveDate || !startTime || !endTime || !executeAt) {
      setMessage('予約日、開始時間、終了時間、予約実行日時は必須です。')
      return
    }

    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch('/reserves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          params: {
            facility: '1',
            court,
            reserveDate,
            startTime,
            endTime,
          },
          executeAt: new Date(executeAt).toISOString(),
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setMessage(body.error ?? `登録に失敗しました (${response.status})`)
        return
      }

      setMessage('予約を登録しました。')
    } catch {
      setMessage('通信エラーが発生しました。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 class="text-lg font-semibold">予約登録</h2>
      <p class="mt-1 text-sm text-slate-500">条件を入力して予約を作成します。</p>

      <form id="reserveForm" class="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label for="authToken" class="mb-1 block text-sm font-medium text-slate-700">
            パスワード
          </label>
          <input
            id="authToken"
            type="password"
            value={token}
            onInput={(e) => onTokenChange((e.target as HTMLInputElement).value)}
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring"
            placeholder="AUTH_TOKEN を入力"
          />
        </div>

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
          type="submit"
          disabled={submitting}
          class="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        >
          {submitting ? '登録中...' : '登録する'}
        </button>
        {message ? <p class="text-sm text-slate-600">{message}</p> : null}
      </form>
    </section>
  )
}
