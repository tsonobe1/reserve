import { afterEach, describe, expect, it, vi } from 'vitest'
import * as labolaYoyogi from '../../../src/reserve/service/labola-yoyogi'

const RESERVE_ID = 'reserve-id-1'
const CUSTOMER_INFO_URL = 'https://labola.jp/r/booking/rental/shop/3094/customer-info/'
const CUSTOMER_CONFIRM_URL = 'https://labola.jp/r/booking/rental/shop/3094/customer-confirm/'

const mockFetch = (impl: Parameters<typeof vi.fn>[0]) => {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch)
  return fetchMock
}

describe('submitLabolaYoyogiCustomerForms', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('customer-info POST の後に customer-confirm POST を送信する', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>)
      .submitLabolaYoyogiCustomerForms as
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

  it('Cookieヘッダが無い場合は送信せず例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>)
      .submitLabolaYoyogiCustomerForms as
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
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>)
      .submitLabolaYoyogiCustomerForms as
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

  it('customer-info が 500 の場合は例外を投げる', async () => {
    const submitCustomerForms = (labolaYoyogi as Record<string, unknown>)
      .submitLabolaYoyogiCustomerForms as
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
})
