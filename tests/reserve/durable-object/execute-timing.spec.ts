import { describe, expect, it, vi } from 'vitest'
import { env, runInDurableObject } from 'cloudflare:test'
import * as reserveDoModule from '../../../src/reserve/durable-object/reserve-durable-object'

describe('execute timing helpers', () => {
  it('初回 alarm は executeAt の10秒前を返す', () => {
    const buildInitialAlarmAt = (reserveDoModule as Record<string, unknown>).buildInitialAlarmAt as
      | ((executeAtMs: number, now: number) => number)
      | undefined

    expect(buildInitialAlarmAt).toBeTypeOf('function')
    const now = 1_700_000_000_000
    const executeAtMs = now + 60_000
    expect(buildInitialAlarmAt?.(executeAtMs, now)).toBe(executeAtMs - 10_000)
  })

  it('executeAt が近い場合は過去時刻にせず即時発火へ丸める', () => {
    const buildInitialAlarmAt = (reserveDoModule as Record<string, unknown>).buildInitialAlarmAt as
      | ((executeAtMs: number, now: number) => number)
      | undefined

    expect(buildInitialAlarmAt).toBeTypeOf('function')
    const now = 1_700_000_000_000
    const executeAtMs = now + 2_000
    expect(buildInitialAlarmAt?.(executeAtMs, now)).toBe(now)
  })

  it('waitUntilExecuteAt は開始時刻までの待機ミリ秒を sleep に渡す', async () => {
    const waitUntilExecuteAt = (reserveDoModule as Record<string, unknown>).waitUntilExecuteAt as
      | ((
          executeAtMs: number | undefined,
          now: number,
          sleep: (ms: number) => Promise<void>
        ) => Promise<number>)
      | undefined

    expect(waitUntilExecuteAt).toBeTypeOf('function')
    const sleep = vi.fn(async () => {})
    const now = 1_700_000_000_000
    const executeAtMs = now + 3_000

    await expect(waitUntilExecuteAt?.(executeAtMs, now, sleep)).resolves.toBe(3_000)
    expect(sleep).toHaveBeenCalledTimes(1)
    expect(sleep).toHaveBeenCalledWith(3_000)
  })
})

describe('ReserveDurableObject.schedule timing', () => {
  it('schedule は executeAt の10秒前を alarm に設定する', async () => {
    const stub = env.RESERVE_DO.get(env.RESERVE_DO.newUniqueId())
    const executeAtMs = Date.now() + 60_000
    const executeAt = new Date(executeAtMs).toISOString()

    const { alarmAt, storedExecuteAt } = await runInDurableObject(stub, async (instance, state) => {
      await (instance as { schedule: (params: unknown, executeAt: string) => Promise<void> }).schedule(
        {
          facilityId: 1,
          courtNo: 1,
          date: '2026-02-13',
          startTime: '15:00',
          endTime: '16:00',
        },
        executeAt
      )
      const alarmAt = await state.storage.getAlarm()
      const storedExecuteAt = await state.storage.get<number>('execute_at_ms')
      return { alarmAt, storedExecuteAt }
    })

    expect(storedExecuteAt).toBe(executeAtMs)
    expect(alarmAt).not.toBeNull()
    expect(alarmAt).toBe(executeAtMs - 10_000)
  })
})
