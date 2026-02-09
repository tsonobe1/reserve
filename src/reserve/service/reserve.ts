import type { ReserveAlarmRecord, ReserveRecord } from '../domain/reserve'
import type { ReserveCreatePayload } from '../domain/reserve-request-schema'
import type { ReserveDurableObject } from '../durable-object/reserve-durable-object'
import { getAll, insert, remove, type InsertReserveValues } from '../repository/reserve'

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

export const getReserve = async (
  reserveDo: DurableObjectNamespace<ReserveDurableObject>,
  doId: string
): Promise<ReserveAlarmRecord> => {
  const stub = reserveDo.get(reserveDo.idFromString(doId))
  const state = (await stub.getState()) as {
    params: unknown
    alarmAt: number | null
  }

  return {
    doId,
    params: state.params,
    alarmAt: state.alarmAt,
  }
}

export const createReserve = async (
  db: D1Database,
  reserveDo: DurableObjectNamespace<ReserveDurableObject>,
  payload: ReserveCreatePayload
): Promise<ReserveRecord> => {
  const doValues = await scheduleReserveDurableObject(reserveDo, payload)
  const values = buildInsertValues(payload, doValues)
  let inserted: Awaited<ReturnType<typeof insert>> | null = null

  try {
    inserted = await insert(db, values)
  } catch (error) {
    await rollbackReserveDurableObject(reserveDo, doValues.doId)
    throw error
  }

  if (!inserted) {
    await rollbackReserveDurableObject(reserveDo, doValues.doId)
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

const buildInsertValues = (
  payload: ReserveCreatePayload,
  doValues: { doNamespace: string; doId: string }
): InsertReserveValues => {
  const paramsJson = JSON.stringify(payload.params)

  const executeAt = payload.executeAt
  const status = 'pending'
  const doNamespace = doValues.doNamespace
  const doId = doValues.doId
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

const scheduleReserveDurableObject = async (
  reserveDo: DurableObjectNamespace<ReserveDurableObject>,
  payload: ReserveCreatePayload
): Promise<{ doNamespace: string; doId: string }> => {
  const objectName = `reserve:${crypto.randomUUID()}`
  const doObjectId = reserveDo.idFromName(objectName)
  const stub = reserveDo.get(doObjectId)
  await stub.schedule(payload.params, payload.executeAt)

  return {
    doNamespace: 'RESERVE_DO',
    doId: doObjectId.toString(),
  }
}

const rollbackReserveDurableObject = async (
  reserveDo: DurableObjectNamespace<ReserveDurableObject>,
  doId: string
): Promise<void> => {
  const stub = reserveDo.get(reserveDo.idFromString(doId))
  await stub.rollback()
}
