import type { ReserveParams } from '../../domain/reserve-request-schema'
import {
  buildBookingUrl,
  buildLoginForm,
  extractFormValues,
  extractCookieHeader,
  fillCustomerInfoRequiredValues,
  mergeCookieHeader,
  postLogin,
  prepareLogin,
  submitCustomerForms,
  type LabolaYoyogiClientEnv,
} from './client'

const YOYOGI_UI_TO_SITE_COURT_NO_MAP: Record<number, string> = {
  1: '479',
  2: '510',
  3: '511',
  4: '535',
}
const LABOLA_REDIRECT_MAX_HOPS = 3

const LABOLA_YOYOGI_BOOKING_NOT_OPEN_TEXTS = [
  'このメンバータイプではこの日時で予約することは出来ません',
  '今現在メンバーの予約は受け付けておりません',
  '今現在ビジターの予約は受け付けておりません',
]

const isBookingNotOpenYet = (html: string): boolean => {
  return LABOLA_YOYOGI_BOOKING_NOT_OPEN_TEXTS.some((text) => html.includes(text))
}

const toCookieSummary = (cookieHeader?: string): string => {
  if (!cookieHeader) return 'none'
  return cookieHeader
    .split(';')
    .map((pair) => pair.trim().split('=')[0])
    .filter(Boolean)
    .join(', ')
}

const isRedirectStatus = (status: number): boolean => {
  return status >= 300 && status < 400
}

const isCalendarUrl = (url: string): boolean => {
  try {
    return new URL(url).pathname.startsWith('/r/shop/3094/calendar/')
  } catch {
    return false
  }
}

const isCustomerInfoUrl = (url: string): boolean => {
  try {
    return new URL(url).pathname.startsWith('/r/booking/rental/shop/3094/customer-info/')
  } catch {
    return false
  }
}

const isLoginOnlyMode = (env: LabolaYoyogiClientEnv): boolean => {
  const value = env.LABOLA_YOYOGI_LOGIN_ONLY?.trim().toLowerCase()
  return value === '1' || value === 'true' || value === 'yes' || value === 'on'
}

const followLoginRedirects = async (
  reserveId: string,
  loginResponse: Response,
  currentCookieHeader: string | undefined
): Promise<string | undefined> => {
  let response = loginResponse
  let cookieHeader = currentCookieHeader
  let baseUrl = response.url || 'https://yoyaku.labola.jp/'

  for (let hop = 0; hop < LABOLA_REDIRECT_MAX_HOPS && isRedirectStatus(response.status); hop += 1) {
    const location = response.headers.get('location')
    if (!location) {
      break
    }
    const redirectedUrl = new URL(location, baseUrl).toString()
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'login-post-redirect-get',
      method: 'GET',
      url: redirectedUrl,
      cookieKeys: toCookieSummary(cookieHeader),
      payload: null,
    })

    try {
      response = await fetch(redirectedUrl, {
        method: 'GET',
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        redirect: 'manual',
      })
    } catch {
      throw new Error('ログインリダイレクト先取得中に通信エラーが発生しました')
    }

    const redirectBodyPreview = await response.clone().text()
    console.log('Labola HTTP Response', {
      id: reserveId,
      step: 'login-post-redirect-get',
      status: response.status,
      location: response.headers.get('location') ?? undefined,
      redirected: response.redirected,
      url: response.url,
      bodySize: redirectBodyPreview.length,
      bodyPreview: redirectBodyPreview.slice(0, 300),
    })
    cookieHeader = mergeCookieHeader(cookieHeader, response.headers.get('set-cookie') ?? undefined)
    baseUrl = redirectedUrl
  }

  return cookieHeader
}

export const mapLabolaYoyogiCourtNo = (uiCourtNo: number): string | undefined => {
  return YOYOGI_UI_TO_SITE_COURT_NO_MAP[uiCourtNo]
}

export const executeLabolaYoyogiReservation = async (
  env: LabolaYoyogiClientEnv,
  reserveId: string,
  params: ReserveParams
): Promise<void> => {
  if (params.facilityId !== 1) {
    console.info('Skip reserve: 非対応施設', {
      id: reserveId,
      facilityId: params.facilityId,
    })
    return
  }

  const siteCourtNo = mapLabolaYoyogiCourtNo(params.courtNo)
  if (!siteCourtNo) {
    console.info('Skip reserve: 非対応コート番号', {
      id: reserveId,
      courtNo: params.courtNo,
    })
    return
  }

  const credentials = await prepareLogin(env, reserveId)
  const loginForm = buildLoginForm(credentials)
  let activeCookieHeader = credentials.loginSetCookieHeader
    ? extractCookieHeader(credentials.loginSetCookieHeader)
    : undefined
  const loginResponse = await postLogin(reserveId, loginForm, activeCookieHeader)
  activeCookieHeader = mergeCookieHeader(
    activeCookieHeader,
    loginResponse.headers.get('set-cookie') ?? undefined
  )
  activeCookieHeader = await followLoginRedirects(reserveId, loginResponse, activeCookieHeader)
  if (isLoginOnlyMode(env)) {
    console.info('Labolaログイン確認モードのためログイン後に処理を終了します', {
      id: reserveId,
      cookieKeys: toCookieSummary(activeCookieHeader),
    })
    return
  }
  const bookingUrl = buildBookingUrl(siteCourtNo, params.date, params.startTime, params.endTime)
  let bookingResponse: Response
  try {
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'booking-page-get',
      method: 'GET',
      url: bookingUrl,
      cookieKeys: toCookieSummary(activeCookieHeader),
      payload: null,
    })
    bookingResponse = await fetch(bookingUrl, {
      method: 'GET',
      headers: activeCookieHeader
        ? {
            Cookie: activeCookieHeader,
          }
        : undefined,
    })
  } catch {
    throw new Error('予約ページ取得中に通信エラーが発生しました')
  }
  if (!bookingResponse.ok) {
    if (isRedirectStatus(bookingResponse.status)) {
      const location = bookingResponse.headers.get('location')
      const bookingRedirectPreview = await bookingResponse.clone().text()
      console.log('Labola HTTP Response', {
        id: reserveId,
        step: 'booking-page-get',
        status: bookingResponse.status,
        location: location ?? undefined,
        redirected: bookingResponse.redirected,
        url: bookingResponse.url,
        bodySize: bookingRedirectPreview.length,
        bodyPreview: bookingRedirectPreview.slice(0, 300),
      })
      if (!location) {
        throw new Error('予約ページ取得に失敗しました: 302（遷移先なし）')
      }
      const redirectedUrl = new URL(location, bookingUrl).toString()
      if (isCustomerInfoUrl(redirectedUrl)) {
        console.info('予約ページ取得で customer-info へのリダイレクトを検出しました', {
          id: reserveId,
          from: bookingUrl,
          to: redirectedUrl,
        })
      }
      try {
        console.log('Labola HTTP Request', {
          id: reserveId,
          step: 'booking-page-get-redirect',
          method: 'GET',
          url: redirectedUrl,
          cookieKeys: toCookieSummary(activeCookieHeader),
          payload: null,
        })
        bookingResponse = await fetch(redirectedUrl, {
          method: 'GET',
          headers: activeCookieHeader
            ? {
                Cookie: activeCookieHeader,
              }
            : undefined,
        })
      } catch {
        throw new Error('予約ページリダイレクト先取得中に通信エラーが発生しました')
      }
      if (!bookingResponse.ok) {
        throw new Error(`予約ページ取得に失敗しました: ${bookingResponse.status}`)
      }
    } else {
      throw new Error(`予約ページ取得に失敗しました: ${bookingResponse.status}`)
    }
  }
  const bookingBodyPreview = await bookingResponse.clone().text()
  console.log('Labola HTTP Response', {
    id: reserveId,
    step: 'booking-page-get',
    status: bookingResponse.status,
    redirected: bookingResponse.redirected,
    url: bookingResponse.url,
    bodySize: bookingBodyPreview.length,
    bodyPreview: bookingBodyPreview.slice(0, 300),
  })
  if (
    bookingResponse.redirected &&
    isCalendarUrl(bookingResponse.url)
  ) {
    throw new Error('希望時間帯は予約不可（カレンダーへリダイレクト）')
  }
  activeCookieHeader = mergeCookieHeader(
    activeCookieHeader,
    bookingResponse.headers.get('set-cookie') ?? undefined
  )
  const bookingPageHtml = await bookingResponse.text()
  if (bookingPageHtml.includes('すでに予約済みです')) {
    throw new Error('希望時間帯は予約不可（すでに予約済み）')
  }
  if (isBookingNotOpenYet(bookingPageHtml)) {
    throw new Error('希望時間帯は予約不可（予約受付前）')
  }
  const extractedCustomerInfoValues = extractFormValues(bookingPageHtml)
  if ((extractedCustomerInfoValues.submit_member ?? '').includes('ログインして予約')) {
    throw new Error('ログインに失敗しました: IDまたはパスワードを確認してください')
  }
  const filledCustomerInfoValues = fillCustomerInfoRequiredValues(extractedCustomerInfoValues, env)
  filledCustomerInfoValues.hold_on_at = params.date
  filledCustomerInfoValues.start = params.startTime.replace(':', '')
  filledCustomerInfoValues.end = params.endTime.replace(':', '')
  if (!filledCustomerInfoValues.payment_method) {
    filledCustomerInfoValues.payment_method = 'front'
  }
  const customerInfoForm = new URLSearchParams()
  for (const [key, value] of Object.entries(filledCustomerInfoValues)) {
    customerInfoForm.set(key, value)
  }
  customerInfoForm.set('submit_conf', '予約内容の確認')
  const customerConfirmForm = new URLSearchParams({
    submit_ok: '申込む',
  })
  console.log('customer-confirm最終送信まで実行します', {
    id: reserveId,
    hasCookie: Boolean(activeCookieHeader),
    customerInfoKeys: Array.from(customerInfoForm.keys()),
    customerConfirmKeys: Array.from(customerConfirmForm.keys()),
  })
  await submitCustomerForms(reserveId, customerInfoForm, customerConfirmForm, activeCookieHeader)
}
