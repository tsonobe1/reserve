import { afterEach, describe, expect, it, vi } from 'vitest'
import * as labolaYoyogi from '../../../src/reserve/service/labola-yoyogi/client'

const RESERVE_ID = 'reserve-id-1'
const CUSTOMER_INFO_URL = 'https://yoyaku.labola.jp/r/booking/rental/shop/3094/customer-info/'
const CUSTOMER_CONFIRM_URL = 'https://yoyaku.labola.jp/r/booking/rental/shop/3094/customer-confirm/'
const CUSTOMER_CONFIRM_SUCCESS_HTML = '<title>予約完了 - LaBOLA総合予約</title><h1>予約完了</h1>'

const mockFetch = (impl: Parameters<typeof vi.fn>[0]) => {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
  return fetchMock
}

describe('submitCustomerForms', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('customer-info POST の後に customer-confirm POST を送信する', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    const fetchMock = mockFetch(async (url) => {
      if (url === CUSTOMER_CONFIRM_URL) {
        return new Response(CUSTOMER_CONFIRM_SUCCESS_HTML, { status: 200 })
      }
      return new Response('', { status: 200 })
    })
    const customerInfoForm = new URLSearchParams({
      csrfmiddlewaretoken: 'csrf-token-from-form',
      submit_conf: '予約内容の確認',
    })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    expect(submitCustomerForms).toBeTypeOf('function')
    await submitCustomerForms?.(
      RESERVE_ID,
      customerInfoForm,
      customerConfirmForm,
      'csrftoken=abc; sessionid=xyz'
    )

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      CUSTOMER_INFO_URL,
      expect.objectContaining({
        method: 'POST',
        body: customerInfoForm.toString(),
        headers: expect.objectContaining({
          Cookie: 'csrftoken=abc; sessionid=xyz',
          Referer: CUSTOMER_INFO_URL,
          Origin: 'https://yoyaku.labola.jp',
          'X-CSRFToken': 'csrf-token-from-form',
        }),
      })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      CUSTOMER_CONFIRM_URL,
      expect.objectContaining({
        method: 'POST',
        body: customerConfirmForm.toString(),
        headers: expect.objectContaining({
          Cookie: 'csrftoken=abc; sessionid=xyz',
        }),
      })
    )
  })

  it('skipFinalSubmit=true の場合は customer-confirm POST を送信しない', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string,
          options?: { skipFinalSubmit?: boolean }
        ) => Promise<void>)
      | undefined

    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await submitCustomerForms?.(
      RESERVE_ID,
      customerInfoForm,
      customerConfirmForm,
      'csrftoken=abc; sessionid=xyz',
      { skipFinalSubmit: true }
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      CUSTOMER_INFO_URL,
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('Cookieヘッダが無い場合は送信せず例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    const fetchMock = mockFetch(async () => new Response('', { status: 200 }))
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(RESERVE_ID, customerInfoForm, customerConfirmForm, undefined)
    ).rejects.toThrow('customer-info/customer-confirm 送信に必要なCookieがありません')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('customer-confirm が 500 の場合は例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        return new Response('', { status: 200 })
      }
      return new Response('', { status: 500 })
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('customer-confirm 送信に失敗しました: 500')
  })

  it('customer-confirm が 200 でも予約完了を確認できない場合は例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        return new Response('<input type="hidden" name="csrfmiddlewaretoken" value="csrf-token">', {
          status: 200,
        })
      }
      return new Response('<title>予約内容の確認 - LaBOLA総合予約</title>', { status: 200 })
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('customer-confirm 応答から予約完了を確認できませんでした')
  })

  it('customer-info が 500 の場合は例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        return new Response('', { status: 500 })
      }
      return new Response('', { status: 200 })
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('customer-info 送信に失敗しました: 500')
  })

  it('customer-info 送信中に通信エラーが発生した場合は例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        throw new TypeError('network down')
      }
      return new Response('', { status: 200 })
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('customer-info 送信中に通信エラーが発生しました')
  })

  it('customer-info がカレンダーへリダイレクトされた場合は予約済みとして中断する', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        return {
          ok: true,
          status: 200,
          redirected: true,
          url: 'https://yoyaku.labola.jp/r/shop/3094/calendar/',
          headers: new Headers(),
          text: async () => '<div>すでに予約済みです。他の時間を選択してください。</div>',
          clone() {
            return this
          },
        } as unknown as Response
      }
      return new Response('', { status: 200 })
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('希望時間帯は予約不可（すでに予約済み）')
  })

  it('customer-info の messages Cookie に予約済み文言がある場合は中断する', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        return new Response('', {
          status: 200,
          headers: {
            'set-cookie':
              'messages="...\\u3059\\u3067\\u306b\\u4e88\\u7d04\\u6e08\\u307f\\u3067\\u3059..."; Path=/',
          },
        })
      }
      return new Response('', { status: 200 })
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('希望時間帯は予約不可（すでに予約済み）')
  })

  it('customer-info が200でもカレンダー画面HTMLを返した場合は中断する', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        return new Response(
          '<title>国立代々木競技場フットサルコート｜空き情報・予約 - LaBOLA総合予約</title>',
          { status: 200 }
        )
      }
      return new Response('', { status: 200 })
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('希望時間帯は予約不可（すでに予約済み）')
  })

  it('customer-confirm 送信中に通信エラーが発生した場合は例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>).submitCustomerForms as
      | ((
          reserveId: string,
          customerInfoForm: URLSearchParams,
          customerConfirmForm: URLSearchParams,
          cookieHeader?: string
        ) => Promise<void>)
      | undefined

    mockFetch(async (url) => {
      if (url === CUSTOMER_INFO_URL) {
        return new Response('', { status: 200 })
      }
      throw new TypeError('network down')
    })
    const customerInfoForm = new URLSearchParams({ submit_conf: '予約内容の確認' })
    const customerConfirmForm = new URLSearchParams({ submit_ok: '申込む' })

    await expect(
      submitCustomerForms?.(
        RESERVE_ID,
        customerInfoForm,
        customerConfirmForm,
        'csrftoken=abc; sessionid=xyz'
      )
    ).rejects.toThrow('customer-confirm 送信中に通信エラーが発生しました')
  })
})
