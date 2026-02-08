import type { ReserveRecord } from '../domain/reserve'

type PersistedReserveValues = Omit<ReserveRecord, 'id' | 'params'> & {
  params: string
}

export type InsertReserveValues = PersistedReserveValues

export type ReserveRow = {
  id: number
} & PersistedReserveValues

export const getAll = async (db: D1Database): Promise<ReserveRow[]> => {
  const query = `select id,
                        params as params,
                        execute_at as executeAt,
                        status as status,
                        do_namespace as doNamespace,
                        do_id as doId,
                        do_scheduled_at as doScheduledAt,
                        created_at as createdAt
                 from reserves
                 order by execute_at desc`

  const { results } = await db.prepare(query).all<ReserveRow>()

  return results ?? []
}

export const get = async (db: D1Database, id: number): Promise<ReserveRow | null> => {
  // TODO: Durable Object から取得する必要がある
  const query = `select id,
                        params as params,
                        execute_at as executeAt,
                        status as status,
                        do_namespace as doNamespace,
                        do_id as doId,
                        do_scheduled_at as doScheduledAt,
                        created_at as createdAt
                 from reserves
                 where id = ?1`

  const record = await db.prepare(query).bind(id).first<ReserveRow>()

  return record ?? null
}

export const insert = async (
  db: D1Database,
  values: InsertReserveValues
): Promise<ReserveRow | null> => {
  const query = `insert into reserves (params,
                                      execute_at,
                                      status,
                                      do_namespace,
                                      do_id,
                                      do_scheduled_at,
                                      created_at)
                 values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                 returning id,
                           params as params,
                           execute_at as executeAt,
                           status as status,
                           do_namespace as doNamespace,
                           do_id as doId,
                           do_scheduled_at as doScheduledAt,
                           created_at as createdAt`

  const inserted = await db
    .prepare(query)
    .bind(
      values.params,
      values.executeAt,
      values.status,
      values.doNamespace,
      values.doId,
      values.doScheduledAt,
      values.createdAt
    )
    .first<ReserveRow>()

  return inserted ?? null
}

export const remove = async (db: D1Database, id: number): Promise<number> => {
  const query = 'delete from reserves where id = ?1'
  const result = await db.prepare(query).bind(id).run()

  return result.meta?.changes ?? 0
}
