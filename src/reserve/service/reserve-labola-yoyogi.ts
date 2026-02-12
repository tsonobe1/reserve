import type { ReserveParams } from '../domain/reserve-request-schema'
import {
  buildLabolaYoyogiLoginForm,
  extractLabolaYoyogiCookieHeader,
  postLabolaYoyogiLogin,
  prepareLabolaYoyogiLogin,
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
  const loginCookieHeader = credentials.loginSetCookieHeader
    ? extractLabolaYoyogiCookieHeader(credentials.loginSetCookieHeader)
    : undefined
  await postLabolaYoyogiLogin(reserveId, loginForm, loginCookieHeader)

  console.log('Labola予約の準備が完了しました（代々木）', {
    id: reserveId,
    date: params.date,
    startTime: params.startTime,
    endTime: params.endTime,
    uiCourtNo: params.courtNo,
    siteCourtNo,
  })
}
