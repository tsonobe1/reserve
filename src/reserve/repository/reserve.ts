import type { ReserveRecord } from '../domain/reserve'

export type InsertReserveValues = {
  params: string
  execute_at: string
  status: string
  alarm_namespace: string
  alarm_object_id: string
  alarm_scheduled_at: string
  created_at: string
}

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

export const insert = async (
  db: D1Database,
  values: InsertReserveValues
): Promise<number | null> => {
  const query = `insert into reserves (params,
                                      execute_at,
                                      status,
                                      alarm_namespace,
                                      alarm_object_id,
                                      alarm_scheduled_at,
                                      created_at)
                 values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 returning id`

  const inserted = await db
    .prepare(query)
    .bind(
      values.params,
      values.execute_at,
      values.status,
      values.alarm_namespace,
      values.alarm_object_id,
      values.alarm_scheduled_at,
      values.created_at
    )
    .first<{ id: number }>()

  return inserted?.id ?? null
}
