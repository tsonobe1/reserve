import type { ReserveRecord } from '../domain/reserve'

export const getAll = async (db: D1Database): Promise<ReserveRecord[]> => {
  const query = `select id,
                        params,
                        execute_at,
                        status,
                        alarm_namespace,
                        alarm_object_id,
                        alarm_scheduled_at,
                        created_at
                 from reserves
                 order by execute_at desc`

  const { results } = await db.prepare(query).all<ReserveRecord>()

  return results ?? []
}
