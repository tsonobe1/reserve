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

const LABOLA_YOYOGI_BOOKING_NOT_OPEN_TEXTS = [
  'このメンバータイプではこの日時で予約することは出来ません',
  '今現在メンバーの予約は受け付けておりません',
  '今現在ビジターの予約は受け付けておりません',
]

const isBookingNotOpenYet = (html: string): boolean => {
  return LABOLA_YOYOGI_BOOKING_NOT_OPEN_TEXTS.some((text) => html.includes(text))
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
  const bookingUrl = buildBookingUrl(siteCourtNo, params.date, params.startTime, params.endTime)
  let bookingResponse: Response
  try {
    console.log('Labola HTTP Request', {
      id: reserveId,
      step: 'booking-page-get',
      method: 'GET',
      url: bookingUrl,
      cookieKeys: activeCookieHeader
        ? activeCookieHeader
            .split(';')
            .map((pair) => pair.trim().split('=')[0])
            .filter(Boolean)
            .join(', ')
        : 'none',
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
    if (bookingResponse.status >= 300 && bookingResponse.status < 400) {
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
      if (redirectedUrl === 'https://labola.jp/r/booking/rental/shop/3094/customer-info/') {
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
          cookieKeys: activeCookieHeader
            ? activeCookieHeader
                .split(';')
                .map((pair) => pair.trim().split('=')[0])
                .filter(Boolean)
                .join(', ')
            : 'none',
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
    bookingResponse.url.includes('https://labola.jp/r/shop/3094/calendar/')
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
  console.log('Dry run: customer-confirm最終送信前で停止します', {
    id: reserveId,
    hasCookie: Boolean(activeCookieHeader),
    customerInfoKeys: Array.from(customerInfoForm.keys()),
    customerConfirmKeys: Array.from(customerConfirmForm.keys()),
  })
  await submitCustomerForms(reserveId, customerInfoForm, customerConfirmForm, activeCookieHeader, {
    skipFinalSubmit: true,
  })
}
