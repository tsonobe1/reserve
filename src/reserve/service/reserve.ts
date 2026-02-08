import type { ReserveRecord } from '../domain/reserve'
import type { ReserveCreatePayload } from '../domain/reserve-request-schema'
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
  const inserted = await insert(db, values)

  if (!inserted) {
    throw new Error('Failed to insert reserve record')
  }

  try {
    return { ...inserted, params: JSON.parse(inserted.params) }
  } catch {
    return { ...inserted, params: inserted.params }
  }
}

export const deleteReserve = async (db: D1Database, id: number): Promise<boolean> => {
  const changes = await remove(db, id)
  return changes === 1
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
