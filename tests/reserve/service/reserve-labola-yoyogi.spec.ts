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
const ENV_WITH_FALLBACK = {
  ...VALID_ENV,
  LABOLA_YOYOGI_NAME: '山田 太郎',
  LABOLA_YOYOGI_DISPLAY_NAME: 'ヤマタロ',
  LABOLA_YOYOGI_EMAIL: 'taro@example.com',
  LABOLA_YOYOGI_ADDRESS: '東京都渋谷区',
  LABOLA_YOYOGI_MOBILE_NUMBER: '090-1111-2222',
}
const LOGIN_URL = 'https://labola.jp/r/shop/3094/member/login/'
const BOOKING_URL =
  'https://labola.jp/r/booking/rental/shop/3094/facility/479/20260220-1000-1100/customer-type/'
const CUSTOMER_INFO_URL = 'https://labola.jp/r/booking/rental/shop/3094/customer-info/'
const CUSTOMER_CONFIRM_URL = 'https://labola.jp/r/booking/rental/shop/3094/customer-confirm/'
const BOOKING_PAGE_HTML = `
<form method="post">
  <input type="text" name="name" value="">
  <input type="text" name="display_name" value="">
  <input type="email" name="email" value="">
  <input type="email" name="email_confirm" value="">
  <input type="text" name="address" value="">
  <input type="text" name="mobile_number" value="">
  <input type="hidden" name="hold_on_at" value="">
  <input type="radio" name="payment_method" value="front" checked>
  <select name="start"><option value="1000" selected>10:00</option></select>
  <select name="end"><option value="1100" selected>11:00</option></select>
</form>
`

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

  it('予約URL遷移後に customer-info/customer-confirm を送信する', async () => {
    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))

    await reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())

    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      CUSTOMER_INFO_URL,
      expect.objectContaining({
        method: 'POST',
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      CUSTOMER_CONFIRM_URL,
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('customer-info は抽出値と環境変数補完を含むフォームを送信する', async () => {
    const fetchMock = mockFetch(async (_url, init) => {
      if (init?.method === 'GET') {
        return new Response(BOOKING_PAGE_HTML, {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=from-get; Path=/, sessionid=from-get-session; Path=/',
          },
        })
      }
      return new Response('', { status: 200 })
    })

    await reserveLabolaYoyogi(ENV_WITH_FALLBACK, RESERVE_ID, createParams())

    const customerInfoCall = fetchMock.mock.calls[3]
    expect(customerInfoCall?.[0]).toBe(CUSTOMER_INFO_URL)
    const customerInfoInit = customerInfoCall?.[1] as RequestInit
    const body = String(customerInfoInit.body)
    expect(body).toContain('name=%E5%B1%B1%E7%94%B0+%E5%A4%AA%E9%83%8E')
    expect(body).toContain('display_name=%E3%83%A4%E3%83%9E%E3%82%BF%E3%83%AD')
    expect(body).toContain('email=taro%40example.com')
    expect(body).toContain('email_confirm=taro%40example.com')
    expect(body).toContain('address=%E6%9D%B1%E4%BA%AC%E9%83%BD%E6%B8%8B%E8%B0%B7%E5%8C%BA')
    expect(body).toContain('mobile_number=090-1111-2222')
    expect(body).toContain('hold_on_at=2026-02-20')
    expect(body).toContain('start=1000')
    expect(body).toContain('end=1100')
    expect(body).toContain('submit_conf=%E4%BA%88%E7%B4%84%E5%86%85%E5%AE%B9%E3%81%AE%E7%A2%BA%E8%AA%8D')
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
