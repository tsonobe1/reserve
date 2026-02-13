import { useState } from 'hono/jsx/dom'

type ReserveRecord = {
  id: number
  params: unknown
  executeAt: string
  status: string
  doId: string
  createdAt: string
}

type ReserveParams = {
  facility?: string
  court?: string
  reserveDate?: string
  facilityId?: number
  courtNo?: number
  date?: string
  startTime?: string
  endTime?: string
}

type ReserveListPanelProps = {
  token: string
}

const facilityNameMap: Record<string, string> = {
  '1': '代々木',
}

export const ReserveListPanel = ({ token }: ReserveListPanelProps) => {
  const [reserves, setReserves] = useState<ReserveRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [actioningId, setActioningId] = useState<number | null>(null)
  const [message, setMessage] = useState('予約データはここに表示されます')

  const sortedReserves = [...reserves].sort((a, b) => {
    const aPending = a.status === 'pending' ? 0 : 1
    const bPending = b.status === 'pending' ? 0 : 1
    if (aPending !== bPending) return aPending - bPending

    const aTime = Number.isNaN(Date.parse(a.executeAt))
      ? Number.MAX_SAFE_INTEGER
      : Date.parse(a.executeAt)
    const bTime = Number.isNaN(Date.parse(b.executeAt))
      ? Number.MAX_SAFE_INTEGER
      : Date.parse(b.executeAt)
    return aTime - bTime
  })

  const toParams = (params: unknown): ReserveParams => {
    if (!params || typeof params !== 'object') return {}
    return params as ReserveParams
  }

  const getFacilityAndCourt = (reserve: ReserveRecord): string => {
    const params = toParams(reserve.params)
    const facilityCode =
      params.facility ?? (params.facilityId != null ? String(params.facilityId) : '')
    const facility = facilityNameMap[facilityCode] ?? (facilityCode || '-')
    const court = params.court ?? (params.courtNo != null ? String(params.courtNo) : '-')
    return `${facility}/${court}`
  }

  const getReserveDatetimeParts = (
    reserve: ReserveRecord
  ): { date: string; timeRange: string } | null => {
    const params = toParams(reserve.params)
    const reserveDateRaw = params.reserveDate ?? params.date
    if (!reserveDateRaw || !params.startTime || !params.endTime) return null
    const reserveDate = reserveDateRaw.replace(/-/g, '/')
    return {
      date: reserveDate,
      timeRange: `${params.startTime}〜${params.endTime}`,
    }
  }

  const formatExecuteAt = (value: string): string => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
  }

  const formatAlarmAt = (value: number): string => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)

    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mi = String(date.getMinutes()).padStart(2, '0')
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`
  }

  const handleReload = async () => {
    if (!token) {
      setMessage('Bearerトークンを入力してください。')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const response = await fetch('/reserves', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setMessage(body.error ?? `取得に失敗しました (${response.status})`)
        return
      }

      const body = (await response.json()) as { reserves: ReserveRecord[] }
      setReserves(body.reserves)
      if (body.reserves.length === 0) {
        setMessage('予約はまだありません。')
      }
    } catch {
      setMessage('通信エラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (reserve: ReserveRecord) => {
    if (!token) {
      setMessage('Bearerトークンを入力してください。')
      return
    }
    const targetLabel =
      `${getFacilityAndCourt(reserve)} ${getReserveDatetimeParts(reserve)?.date ?? '-'} ${getReserveDatetimeParts(reserve)?.timeRange ?? ''}`.trim()
    if (!window.confirm(`「${targetLabel}」を削除しますか？`)) {
      return
    }

    setActioningId(reserve.id)
    setMessage('')
    try {
      const response = await fetch(`/reserves/${reserve.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setMessage(body.error ?? `削除に失敗しました (${response.status})`)
        return
      }

      setReserves((prev) => prev.filter((item) => item.id !== reserve.id))
      setMessage(`「${targetLabel}」を削除しました。`)
    } catch {
      setMessage('通信エラーが発生しました。')
    } finally {
      setActioningId(null)
    }
  }

  const handleConfirm = async (reserve: ReserveRecord) => {
    if (!token) {
      setMessage('Bearerトークンを入力してください。')
      return
    }

    setActioningId(reserve.id)
    setMessage('')
    try {
      const response = await fetch(`/reserves/do/${reserve.doId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        setMessage(body.error ?? `確認に失敗しました (${response.status})`)
        return
      }

      const body = (await response.json()) as {
        reserve: { alarmAt: number | null }
      }
      const detailText =
        body.reserve.alarmAt == null
          ? '予約が設定されていません'
          : `${formatAlarmAt(body.reserve.alarmAt)}に予約が実行される予定です。`
      window.alert(detailText)
    } catch {
      setMessage('通信エラーが発生しました。')
    } finally {
      setActioningId(null)
    }
  }

  return (
    <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">予約一覧</h2>
        <button
          type="button"
          disabled={loading}
          onClick={handleReload}
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          {loading ? '取得中...' : '再読み込み'}
        </button>
      </div>
      <p class="mt-1 text-sm text-slate-500">作成済みの予約を表示します。</p>

      {sortedReserves.length === 0 ? (
        <div class="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          {message}
        </div>
      ) : (
        <div class="mt-5 overflow-x-auto rounded-lg border border-slate-200">
          <table class="min-w-full border-collapse text-sm">
            <thead class="bg-slate-50 text-slate-700">
              <tr>
                <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">
                  施設/コード
                </th>
                <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">予約日時</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">
                  予約実行日時
                </th>
                <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">状態</th>
                <th class="border-b border-slate-200 px-3 py-2 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedReserves.map((reserve) => (
                <tr key={reserve.id} class="align-top odd:bg-white even:bg-slate-50/50">
                  <td class="border-b border-slate-200 px-3 py-2">
                    {getFacilityAndCourt(reserve)}
                  </td>
                  <td class="border-b border-slate-200 px-3 py-2">
                    {getReserveDatetimeParts(reserve) ? (
                      <>
                        <div>{getReserveDatetimeParts(reserve)?.date}</div>
                        <div>{getReserveDatetimeParts(reserve)?.timeRange}</div>
                      </>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td class="border-b border-slate-200 px-3 py-2">
                    {formatExecuteAt(reserve.executeAt)}
                  </td>
                  <td class="border-b border-slate-200 px-3 py-2">{reserve.status}</td>
                  <td class="border-b border-slate-200 px-3 py-2">
                    <div class="flex gap-2">
                      <button
                        type="button"
                        disabled={actioningId === reserve.id}
                        onClick={() => handleDelete(reserve)}
                        class="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        削除
                      </button>
                      <button
                        type="button"
                        disabled={actioningId === reserve.id}
                        onClick={() => handleConfirm(reserve)}
                        class="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                      >
                        確認
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
