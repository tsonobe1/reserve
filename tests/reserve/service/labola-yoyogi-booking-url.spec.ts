import { describe, expect, it } from 'vitest'
import * as labolaYoyogi from '../../../src/reserve/service/labola-yoyogi/client'

describe('buildBookingUrl', () => {
  it('コート番号・日付・開始/終了時刻から予約URLを組み立てる', () => {
    const buildBookingUrl = (labolaYoyogi as Record<string, unknown>).buildBookingUrl as
      | ((siteCourtNo: string, date: string, startTime: string, endTime: string) => string)
      | undefined

    expect(buildBookingUrl).toBeTypeOf('function')
    expect(buildBookingUrl?.('511', '2026-02-13', '15:00', '16:00')).toBe(
      'https://yoyaku.labola.jp/r/booking/rental/shop/3094/facility/511/20260213-1500-1600/customer-type/'
    )
  })
})
