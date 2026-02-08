import type { ReserveRecord } from '../domain/reserve'
import { getAll } from '../repository/reserve'

/**
 * D1検索結果をJSONパースして返すドメインサービス関数
 */
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
