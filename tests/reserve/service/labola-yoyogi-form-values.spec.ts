import { describe, expect, it } from 'vitest'
import * as labolaYoyogi from '../../../src/reserve/service/labola-yoyogi/client'

const CUSTOMER_INFO_HTML = `
<form method="post">
  <input type="text" name="name" value="XX XX" required id="id_name" maxlength="100">
  <input type="text" name="display_name" value="DISPLAY" required id="id_display_name" maxlength="100">
  <input type="email" name="email" value="sample@example.com" required id="id_email" maxlength="100">
  <input type="email" name="email_confirm" value="sample@example.com" required id="id_email_confirm" maxlength="100">
  <input type="text" name="address" value="TOKYO" required id="id_address" maxlength="100">
  <input type="text" name="mobile_number" value="090-0000-0000" required id="id_mobile_number" maxlength="50">
  <input type="hidden" name="hold_on_at" value="2026-02-13" id="id_hold_on_at">
  <input type="radio" name="payment_method" value="front" checked>
  <select name="start" id="id_start">
    <option value="0900">09:00</option>
    <option value="1500" selected>15:00</option>
  </select>
  <select name="end" id="id_end">
    <option value="1600" selected>16:00</option>
    <option value="1700">17:00</option>
  </select>
</form>
`

describe('extractFormValues', () => {
  it('customer-info の既定フォーム値を抽出できる', () => {
    const extractFormValues = (labolaYoyogi as Record<string, unknown>).extractFormValues as
      | ((html: string) => Record<string, string>)
      | undefined

    expect(extractFormValues).toBeTypeOf('function')
    expect(extractFormValues?.(CUSTOMER_INFO_HTML)).toStrictEqual({
      name: 'XX XX',
      display_name: 'DISPLAY',
      email: 'sample@example.com',
      email_confirm: 'sample@example.com',
      address: 'TOKYO',
      mobile_number: '090-0000-0000',
      hold_on_at: '2026-02-13',
      payment_method: 'front',
      start: '1500',
      end: '1600',
    })
  })
})
