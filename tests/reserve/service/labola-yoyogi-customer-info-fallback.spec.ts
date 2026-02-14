import { describe, expect, it } from 'vitest'
import * as labolaYoyogi from '../../../src/reserve/service/labola-yoyogi/client'

describe('fillCustomerInfoRequiredValues', () => {
  it('必須項目が空欄の場合は環境変数で補完する', () => {
    const fillRequiredValues = (labolaYoyogi as Record<string, unknown>)
      .fillCustomerInfoRequiredValues as
      | ((values: Record<string, string>, env: Record<string, string>) => Record<string, string>)
      | undefined

    const input = {
      name: '',
      display_name: '',
      email: '',
      email_confirm: '',
      address: '',
      mobile_number: '',
    }

    const env = {
      LABOLA_YOYOGI_NAME: '山田 太郎',
      LABOLA_YOYOGI_DISPLAY_NAME: 'ヤマタロ',
      LABOLA_YOYOGI_EMAIL: 'taro@example.com',
      LABOLA_YOYOGI_ADDRESS: '東京都渋谷区',
      LABOLA_YOYOGI_MOBILE_NUMBER: '090-1111-2222',
    }

    expect(fillRequiredValues).toBeTypeOf('function')
    expect(fillRequiredValues?.(input, env)).toStrictEqual({
      name: '山田 太郎',
      display_name: 'ヤマタロ',
      email: 'taro@example.com',
      email_confirm: 'taro@example.com',
      address: '東京都渋谷区',
      mobile_number: '090-1111-2222',
    })
  })
})
