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
  const target = new Date(year, month - 1, day, 0, 0, 0, 0)
  target.setDate(target.getDate() - 60)

  return `${target.getFullYear()}-${pad2(target.getMonth() + 1)}-${pad2(target.getDate())}T${pad2(target.getHours())}:${pad2(target.getMinutes())}`
}
