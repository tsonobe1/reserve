import type { ReserveParams } from '../domain/reserve-request-schema'
import {
  buildLabolaYoyogiBookingUrl,
  buildLabolaYoyogiLoginForm,
  extractLabolaYoyogiFormValues,
  extractLabolaYoyogiCookieHeader,
  fillLabolaYoyogiCustomerInfoRequiredValues,
  mergeLabolaYoyogiCookieHeader,
  postLabolaYoyogiLogin,
  prepareLabolaYoyogiLogin,
  submitLabolaYoyogiCustomerForms,
  type LabolaYoyogiEnv,
} from './labola-yoyogi'

const YOYOGI_UI_TO_SITE_COURT_NO_MAP: Record<number, string> = {
  1: '479',
  2: '510',
  3: '511',
  4: '535',
}

export const toLabolaYoyogiCourtNo = (uiCourtNo: number): string | undefined => {
  return YOYOGI_UI_TO_SITE_COURT_NO_MAP[uiCourtNo]
}

export const reserveLabolaYoyogi = async (
  env: LabolaYoyogiEnv,
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

  const siteCourtNo = toLabolaYoyogiCourtNo(params.courtNo)
  if (!siteCourtNo) {
    console.info('Skip reserve: 非対応コート番号', {
      id: reserveId,
      courtNo: params.courtNo,
    })
    return
  }

  const credentials = await prepareLabolaYoyogiLogin(env, reserveId)
  const loginForm = buildLabolaYoyogiLoginForm(credentials)
  let activeCookieHeader = credentials.loginSetCookieHeader
    ? extractLabolaYoyogiCookieHeader(credentials.loginSetCookieHeader)
    : undefined
  await postLabolaYoyogiLogin(reserveId, loginForm, activeCookieHeader)
  const bookingUrl = buildLabolaYoyogiBookingUrl(
    siteCourtNo,
    params.date,
    params.startTime,
    params.endTime
  )
  let bookingResponse: Response
  try {
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
    throw new Error(`予約ページ取得に失敗しました: ${bookingResponse.status}`)
  }
  activeCookieHeader = mergeLabolaYoyogiCookieHeader(
    activeCookieHeader,
    bookingResponse.headers.get('set-cookie') ?? undefined
  )
  const bookingPageHtml = await bookingResponse.text()
  const extractedCustomerInfoValues = extractLabolaYoyogiFormValues(bookingPageHtml)
  const filledCustomerInfoValues = fillLabolaYoyogiCustomerInfoRequiredValues(
    extractedCustomerInfoValues,
    env
  )
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
  await submitLabolaYoyogiCustomerForms(
    reserveId,
    customerInfoForm,
    customerConfirmForm,
    activeCookieHeader
  )

  console.log('Labola予約の準備が完了しました（代々木）', {
    id: reserveId,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    uiCourtNo: params.courtNo,
    siteCourtNo,
    hasSessionCookie: Boolean(activeCookieHeader),
  })
}
