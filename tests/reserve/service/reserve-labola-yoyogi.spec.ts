import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  reserveLabolaYoyogi,
  toLabolaYoyogiCourtNo,
} from '../../../src/reserve/service/reserve-labola-yoyogi'

const RESERVE_ID = 'reserve-id-1'
const VALID_ENV = {
  LABOLA_YOYOGI_USERNAME: 'user',
  LABOLA_YOYOGI_PASSWORD: 'pass',
}
const LOGIN_URL = 'https://labola.jp/r/shop/3094/member/login/'
const BOOKING_URL =
  'https://labola.jp/r/booking/rental/shop/3094/facility/479/20260220-1000-1100/customer-type/'

const mockFetch = (impl: Parameters<typeof vi.fn>[0]) => {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
  return fetchMock
}

const createParams = (overrides?: Partial<Parameters<typeof reserveLabolaYoyogi>[2]>) => ({
  facilityId: 1,
  courtNo: 1,
  date: '2026-02-20',
  startTime: '10:00',
  endTime: '11:00',
  ...overrides,
})

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

  it('対応コート番号ならログインGET/POST後に予約URLへ遷移する', async () => {
    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))

    await reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      LOGIN_URL,
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      LOGIN_URL,
      expect.objectContaining({
        method: 'POST',
        body: 'username=user&password=pass',
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      BOOKING_URL,
      expect.objectContaining({
        method: 'GET',
      })
    )
  })

  it('ログインGETで取得したcookieをログインPOSTへ引き継ぐ', async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      if (init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      return new Response('', { status: 200 })
    })

    await reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      LOGIN_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Cookie: 'csrftoken=get-token; sessionid=get-session',
        }),
      })
    )
  })

  it('ログインGETで取得したcookieを予約URL GETへ引き継ぐ', async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      if (init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      return new Response('', { status: 200 })
    })

    await reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      BOOKING_URL,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Cookie: 'csrftoken=get-token; sessionid=get-session',
        }),
      })
    )
  })

  it('facilityId が 1 以外ならスキップして fetch を呼ばない', async () => {
    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))

    await reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams({ facilityId: 2 }))

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('非対応の courtNo ならスキップして fetch を呼ばない', async () => {
    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))

    await reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams({ courtNo: 9 }))

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
