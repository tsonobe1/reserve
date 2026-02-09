export type ReserveRecord = {
  id: number
  params: unknown
  executeAt: string
  status: string
  doNamespace: string
  doId: string
  doScheduledAt: string
  createdAt: string
}

export type ReserveAlarmRecord = {
  doId: string
  params: unknown
  alarmAt: number | null
}
