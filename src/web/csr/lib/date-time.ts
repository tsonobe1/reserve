const pad2 = (n: number) => String(n).padStart(2, '0')

export const addHours = (hhmm: string, hours: number): string | null => {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null

  const total = h + hours
  if (total > 23) return null

  return `${pad2(total)}:${pad2(m)}`
}

export const toExecuteAtJst = (yyyyMmDd: string): string => {
  const [year, month, day] = yyyyMmDd.split('-').map(Number)
  const baseUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0)
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000
  const targetUtcMs = baseUtcMs - sixtyDaysMs
  const jst = new Date(targetUtcMs + 9 * 60 * 60 * 1000)

  return `${jst.getUTCFullYear()}-${pad2(jst.getUTCMonth() + 1)}-${pad2(jst.getUTCDate())}T${pad2(jst.getUTCHours())}:${pad2(jst.getUTCMinutes())}`
}
