import type { ReserveRecord } from '../domain/reserve'
import type { ReserveCreatePayload } from '../domain/reserve-create-payload'
import { get, getAll, insert, remove, type InsertReserveValues } from '../repository/reserve'

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
  payload: ReserveCreatePayload
): Promise<ReserveRecord> => {
  const values = buildInsertValues(payload)
  const insertedId = await insert(db, values)

  if (!insertedId) {
    throw new Error('Failed to insert reserve record')
  }

  return {
    id: insertedId,
    params: payload.params,
    executeAt: values.executeAt,
    status: values.status,
    doNamespace: values.doNamespace,
    doId: values.doId,
    doScheduledAt: values.doScheduledAt,
    createdAt: values.createdAt,
  }
}

export const deleteReserve = async (db: D1Database, id: number): Promise<boolean> => {
  const changes = await remove(db, id)
  return changes > 0
}

const buildInsertValues = (payload: ReserveCreatePayload): InsertReserveValues => {
  const paramsJson = JSON.stringify(payload.params)

  const executeAt = payload.executeAt
  const status = 'pending'
  const doNamespace = 'reserve'
  const doId = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  return {
    params: paramsJson,
    executeAt,
    status,
    doNamespace,
    doId,
    doScheduledAt: executeAt,
    createdAt,
  }
}
