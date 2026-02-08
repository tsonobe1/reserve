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

export const get = async (db: D1Database, id: number): Promise<ReserveRecord | null> => {
  // TODO: Durable Object から取得する必要がある
  const query = `select id,
                        params,
                        execute_at,
                        status,
                        alarm_namespace,
                        alarm_object_id,
                        alarm_scheduled_at,
                        created_at
                 from reserves
                 where id = ?1`

  const record = await db.prepare(query).bind(id).first<ReserveRecord>()

  return record ?? null
}
