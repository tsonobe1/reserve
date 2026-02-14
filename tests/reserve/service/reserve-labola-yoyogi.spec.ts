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
const BOOKING_PAGE_ALREADY_RESERVED_HTML = `
<div id="flash_messages" class="alert alert-info">
  <ul class="messages">
    <li class="error">すでに予約済みです。他の時間を選択してください。</li>
  </ul>
</div>
`
const BOOKING_PAGE_LOGIN_REQUIRED_HTML = `
<form method="post">
  <input type="hidden" name="member_type_id" value="397">
  <input type="submit" name="submit_member" value="ログインして予約">
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

    expect(fetchMock).toHaveBeenCalledTimes(4)
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
        body: 'membership_code=user&password=pass&member_type_id=397',
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

    expect(fetchMock).toHaveBeenCalledTimes(4)
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

  it('ログインPOSTで更新されたcookieを予約URL GETへ引き継ぐ', async () => {
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'sessionid=post-session; Path=/',
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
          Cookie: 'csrftoken=get-token; sessionid=post-session',
        }),
      })
    )
  })

  it('Dry run中は customer-info は送信し customer-confirm は送信しない', async () => {
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

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/customer-info/'))).toBe(
      true
    )
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/customer-confirm/'))
    ).toBe(false)
  })

  it('Dry run中でも customer-info 用フォーム値は組み立てられる', async () => {
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

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      CUSTOMER_INFO_URL,
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('Dry run中は customer-confirm を送信しない', async () => {
    const fetchMock = mockFetch(async (url, init) => {
      if (url === BOOKING_URL && init?.method === 'GET') {
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

    expect(fetchMock).toHaveBeenCalledTimes(4)
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/customer-confirm/'))
    ).toBe(false)
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

  it('予約URL GET が 500 の場合は例外を投げる', async () => {
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', { status: 200 })
      }
      if (url === BOOKING_URL && init?.method === 'GET') {
        return new Response('', { status: 500 })
      }
      return new Response('', { status: 200 })
    })

    await expect(reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())).rejects.toThrow(
      '予約ページ取得に失敗しました: 500'
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('予約URL GET中に通信エラーが発生した場合は例外を投げる', async () => {
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', { status: 200 })
      }
      if (url === BOOKING_URL && init?.method === 'GET') {
        throw new TypeError('network down')
      }
      return new Response('', { status: 200 })
    })

    await expect(reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())).rejects.toThrow(
      '予約ページ取得中に通信エラーが発生しました'
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('予約済みメッセージを検出した場合は中断する', async () => {
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', { status: 200 })
      }
      if (url === BOOKING_URL && init?.method === 'GET') {
        return new Response(BOOKING_PAGE_ALREADY_RESERVED_HTML, { status: 200 })
      }
      return new Response('', { status: 200 })
    })

    await expect(reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())).rejects.toThrow(
      '希望時間帯は予約不可（すでに予約済み）'
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('予約ページ取得がカレンダーへリダイレクトされた場合は中断する', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', { status: 200 })
      }
      if (url === BOOKING_URL && init?.method === 'GET') {
        return {
          ok: true,
          status: 200,
          redirected: true,
          url: 'https://labola.jp/r/shop/3094/calendar/',
          headers: new Headers(),
          text: async () => '',
          clone() {
            return this
          },
        } as unknown as Response
      }
      return new Response('', { status: 200 })
    })

    await expect(reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())).rejects.toThrow(
      '希望時間帯は予約不可（カレンダーへリダイレクト）'
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(logSpy).toHaveBeenCalledWith(
      'Labola HTTP Response',
      expect.objectContaining({
        id: RESERVE_ID,
        step: 'booking-page-get',
        status: 200,
      })
    )
  })

  it('予約ページ取得が customer-info へ 302 の場合は追従して継続する', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', {
          status: 302,
          headers: {
            location: '/r/customer/member-bookings/',
            'set-cookie': 'booking-prod=booking-token; Path=/',
          },
        })
      }
      if (url === BOOKING_URL && init?.method === 'GET') {
        return new Response('', {
          status: 302,
          headers: {
            location: '/r/booking/rental/shop/3094/customer-info/',
          },
        })
      }
      if (url === CUSTOMER_INFO_URL && init?.method === 'GET') {
        return new Response(BOOKING_PAGE_HTML, { status: 200 })
      }
      return new Response('', { status: 200 })
    })

    await expect(reserveLabolaYoyogi(ENV_WITH_FALLBACK, RESERVE_ID, createParams())).resolves.toBe(
      undefined
    )
    expect(fetchMock).toHaveBeenCalledWith(
      CUSTOMER_INFO_URL,
      expect.objectContaining({
        method: 'GET',
      })
    )
    expect(infoSpy).toHaveBeenCalledWith(
      '予約ページ取得で customer-info へのリダイレクトを検出しました',
      expect.objectContaining({
        id: RESERVE_ID,
        from: BOOKING_URL,
        to: CUSTOMER_INFO_URL,
      })
    )
  })

  it('予約ページ取得が302でlocation欠落の場合はログを出して中断する', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', { status: 200 })
      }
      if (url === BOOKING_URL && init?.method === 'GET') {
        return new Response('', { status: 302 })
      }
      return new Response('', { status: 200 })
    })

    await expect(reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())).rejects.toThrow(
      '予約ページ取得に失敗しました: 302（遷移先なし）'
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(logSpy).toHaveBeenCalledWith(
      'Labola HTTP Response',
      expect.objectContaining({
        id: RESERVE_ID,
        step: 'booking-page-get',
        status: 302,
        location: undefined,
      })
    )
  })

  it('未ログイン誘導フォームを検出した場合はログイン失敗として中断する', async () => {
    const fetchMock = mockFetch(async (url, init) => {
      if (url === LOGIN_URL && init?.method === 'GET') {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie': 'csrftoken=get-token; Path=/, sessionid=get-session; Path=/',
          },
        })
      }
      if (url === LOGIN_URL && init?.method === 'POST') {
        return new Response('', { status: 200 })
      }
      if (url === BOOKING_URL && init?.method === 'GET') {
        return new Response(BOOKING_PAGE_LOGIN_REQUIRED_HTML, { status: 200 })
      }
      return new Response('', { status: 200 })
    })

    await expect(reserveLabolaYoyogi(VALID_ENV, RESERVE_ID, createParams())).rejects.toThrow(
      'ログインに失敗しました: IDまたはパスワードを確認してください'
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(
      fetchMock.mock.calls.some((call) => String(call[0]).includes('/customer-info/'))
    ).toBe(false)
  })
})
