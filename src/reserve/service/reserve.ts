import type { ReserveRecord } from '../domain/reserve'
import type { ReservePayload } from '../domain/reserve-payload'
import { get, getAll, insert, type InsertReserveValues } from '../repository/reserve'

export const getReserves = async (db: D1Database): Promise<ReserveRecord[]> => {
  const records = await getAll(db)

  return records.map((record) => {
    try {
      return { ...record, params: JSON.parse(record.params) }
    } catch {
      return { ...record, params: record.params }
    }
  })
}

export const getReserve = async (db: D1Database, id: number): Promise<ReserveRecord | null> => {
  const record = await get(db, id)

  if (!record) {
    return null
  }

  try {
    return { ...record, params: JSON.parse(record.params) }
  } catch {
    return { ...record, params: record.params }
  }
}

export const createReserve = async (
  db: D1Database,
  payload: ReservePayload
): Promise<ReserveRecord> => {
  const values = buildInsertValues(payload)
  const insertedId = await insert(db, values)

  if (!insertedId) {
    throw new Error('Failed to insert reserve record')
  }

  return {
    id: insertedId,
    params: payload.params,
    execute_at: values.execute_at,
    status: values.status,
    alarm_namespace: values.alarm_namespace,
    alarm_object_id: values.alarm_object_id,
    alarm_scheduled_at: values.alarm_scheduled_at,
    created_at: values.created_at,
  }
}

const buildInsertValues = (payload: ReservePayload): InsertReserveValues => {
  const paramsJson =
    typeof payload.params === 'string' ? payload.params : JSON.stringify(payload.params)

  const executeAt = payload.execute_at ?? new Date().toISOString()
  const status = payload.status ?? 'pending'
  const alarmNamespace = payload.alarm_namespace ?? 'reserve'
  const alarmObjectId = payload.alarm_object_id ?? crypto.randomUUID()
  const alarmScheduledAt = payload.alarm_scheduled_at ?? executeAt
  const createdAt = new Date().toISOString()

  return {
    params: paramsJson,
    execute_at: executeAt,
    status,
    alarm_namespace: alarmNamespace,
    alarm_object_id: alarmObjectId,
    alarm_scheduled_at: alarmScheduledAt,
    created_at: createdAt,
  }
}
