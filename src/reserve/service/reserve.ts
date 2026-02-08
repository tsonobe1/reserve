import type { ReserveRecord } from '../domain/reserve'
import { get, getAll } from '../repository/reserve'

export const getReserves = async (db: D1Database): Promise<ReserveRecord[]> => {
  const records = await getAll(db)

  return records.map((record) => {
    try {
      return { ...record, params: JSON.parse(record.params) }
    } catch {
      return record
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
    return record
  }
}
