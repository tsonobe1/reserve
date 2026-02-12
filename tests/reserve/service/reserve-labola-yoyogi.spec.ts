import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  reserveLabolaYoyogi,
  toLabolaYoyogiCourtNo,
} from '../../../src/reserve/service/reserve-labola-yoyogi'

describe('toLabolaYoyogiCourtNo', () => {
  it('UIのコート番号 1-4 をサイト用の値へ変換する', () => {
    expect(toLabolaYoyogiCourtNo(1)).toBe('479')
    expect(toLabolaYoyogiCourtNo(2)).toBe('510')
    expect(toLabolaYoyogiCourtNo(3)).toBe('511')
    expect(toLabolaYoyogiCourtNo(4)).toBe('535')
  })

  it('非対応のコート番号は undefined を返す', () => {
    expect(toLabolaYoyogiCourtNo(0)).toBeUndefined()
    expect(toLabolaYoyogiCourtNo(5)).toBeUndefined()
  })
})

describe('reserveLabolaYoyogi', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('対応コート番号ならログインGET/POSTを実行する', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)

    await reserveLabolaYoyogi(
      { LABOLA_YOYOGI_USERNAME: 'user', LABOLA_YOYOGI_PASSWORD: 'pass' },
      'reserve-id-1',
      {
        facilityId: 1,
        courtNo: 1,
        date: '2026-02-20',
        startTime: '10:00',
        endTime: '11:00',
      }
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://labola.jp/r/shop/3094/member/login/',
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://labola.jp/r/shop/3094/member/login/',
      expect.objectContaining({
        method: 'POST',
        body: 'username=user&password=pass',
      })
    )
  })
})
